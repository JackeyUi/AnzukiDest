#!/usr/bin/env python3
"""Re-matte original footage without shrinking hair, resizing, or lossy encoding.

Dependencies: numpy, scipy, pillow, pymatting==1.1.16, ffmpeg, ffprobe.
Only the trimap seeds are eroded, never the output alpha/hair silhouette.
"""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
import argparse, hashlib, json, os, shutil, subprocess, time
import numpy as np
from scipy.ndimage import gaussian_filter, binary_erosion, distance_transform_edt
from PIL import Image
from pymatting import estimate_alpha_cf, estimate_foreground_ml

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'materials/animation-v5-hair-cleanup'
SOURCES=[
 ('idle-loop-long','materials/animation-v1/original/video2_loop_long.mp4',0,94,'長循環'),
 ('idle-loop-short','materials/animation-v1/original/video2_loop_short.mp4',0,60,'短循環'),
 ('click-bounce-1','materials/animation-v1/original/gemini_generated_video_1019414a.mp4',6,60,'點擊彈動一'),
 ('click-bounce-2','materials/animation-v1/original/gemini_generated_video_1019414a.mp4',72,128,'點擊彈動二'),
 ('drag-held','materials/animation-v5-hair-cleanup/original/grab_loop.mp4',0,109,'抓起'),
 ('land','materials/animation-v3/original/落地_裁切.mp4',0,119,'落地'),
 ('nap-start','materials/animation-v3/original/小憩_start.mp4',0,240,'小憩開始'),
 ('nap-loop','materials/animation-v3/original/小憩_loop.mp4',0,63,'小憩循環'),
 ('read-book','materials/animation-v3/original/拿書.mp4',0,240,'拿書'),
 ('adjust-hat','materials/animation-v3/original/扶帽子.mp4',48,240,'扶帽子'),
 ('catch-star','materials/animation-v3/original/抓星星.mp4',0,240,'抓星星'),
]

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def pixel_hash(rgba):
    a=np.array(rgba,dtype=np.uint8,copy=True);a[a[...,3]==0,:3]=0
    return hashlib.sha256(a.tobytes()).hexdigest()

def key_frame(frame):
    rgb=frame.astype(np.float64)/255
    excess=rgb[...,1]-np.maximum(rgb[...,0],rgb[...,2])
    screen_mask=excess>0.30
    weight=gaussian_filter(screen_mask.astype(float),12)
    # Background-only smoothing estimates the varying screen color. Artwork is not blurred.
    screen=np.stack([gaussian_filter(rgb[...,i]*screen_mask,12)/np.maximum(weight,1e-6) for i in range(3)],axis=2)
    bg=screen_mask&(np.linalg.norm(rgb-screen,axis=2)<0.06)
    fg=binary_erosion(excess < -0.012,iterations=1)
    trimap=np.full(excess.shape,.5);trimap[bg]=0;trimap[fg]=1
    alpha=estimate_alpha_cf(rgb,trimap,laplacian_kwargs={'epsilon':1e-7},cg_kwargs={'rtol':1e-6,'maxiter':500})
    color=estimate_foreground_ml(rgb,alpha,regularization=1e-5)
    color[fg]=rgb[fg]
    # Some contaminated silver hair is cyan (B just exceeds G), so a G>max(R,B)
    # test alone misses it. Remove that spill only next to the screen, retaining R/B detail.
    edge_distance=distance_transform_edt(~bg)
    ceiling=color[...,0]+0.60*(color[...,2]-color[...,0])
    spill=(edge_distance<=10)&(color[...,2]>=color[...,0])&(color[...,1]>ceiling+2/255)
    color[...,1]=np.where(spill,np.minimum(color[...,1],ceiling),color[...,1])
    color[...,1]=np.minimum(color[...,1],np.maximum(color[...,0],color[...,2]))
    rgba=np.rint(np.dstack((np.clip(color,0,1),np.clip(alpha,0,1)))*255).astype(np.uint8)
    rgba[rgba[...,3]==0,:3]=0
    protected=fg&~spill
    changed=np.any(rgba[...,:3]!=frame,axis=2)
    assert not np.any(changed&protected), 'Original interior colors changed'
    assert np.all(rgba[protected,3]==255), 'Original interior coverage changed'
    visible=rgba[...,3]>0
    green=visible&(rgba[...,1]>np.maximum(rgba[...,0],rgba[...,2]))
    assert not np.any(green), 'Green-dominant visible pixel remains'
    stats={'protectedCorePixels':int(protected.sum()),'protectedCorePixelsChanged':0,
           'opaquePixelsChanged':int(np.count_nonzero(changed&(rgba[...,3]==255))),
           'visibleGreenDominantPixels':int(green.sum()),'cyanSpillPixelsCorrected':int(np.count_nonzero(spill&visible))}
    return rgba,stats

def process_clip(row):
    name,relative,start,end,label=row;source=ROOT/relative
    record_path=OUT/'verification'/(name+'.json');dest=OUT/'full-resolution'/(name+'.webp')
    if record_path.exists():
        cached=json.loads(record_path.read_text())
        if dest.exists() and cached['sourceSha256']==digest(source) and cached['sha256']==digest(dest):return cached
    info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(source)]))
    video=next(s for s in info['streams'] if s['codec_type']=='video')
    assert (video['width'],video['height'],video['r_frame_rate'])==(720,1280,'24/1')
    assert int(video['nb_frames'])>=end
    temporary=dest.with_suffix('.building.webp')
    decoder=subprocess.Popen(['ffmpeg','-v','error','-threads','1','-i',str(source),'-map','0:v:0','-vf',f'trim=start_frame={start}:end_frame={end},setpts=PTS-STARTPTS','-an','-fps_mode','passthrough','-pix_fmt','rgb24','-f','rawvideo','-'],stdout=subprocess.PIPE)
    # In lossless mode quality controls compression effort, not image fidelity.
    # Use faster packing; verify the exact decoded RGBA of every frame below.
    encoder=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size','720x1280','-framerate','24','-i','-','-an','-c:v','libwebp_anim','-threads','1','-lossless','1','-quality','50','-compression_level','0','-loop','0','-pix_fmt','bgra',str(temporary)],stdin=subprocess.PIPE)
    hashes=[];totals={};started=time.monotonic()
    try:
        while True:
            raw=decoder.stdout.read(720*1280*3)
            if not raw:break
            assert len(raw)==720*1280*3
            frame=np.frombuffer(raw,np.uint8).reshape(1280,720,3)
            rgba,stats=key_frame(frame)
            for key,value in stats.items():totals[key]=totals.get(key,0)+value
            hashes.append(pixel_hash(rgba));encoder.stdin.write(rgba.tobytes())
            i=len(hashes)-1
            if i in {0,(end-start)//2,end-start-1}:
                Image.fromarray(rgba).save(OUT/'previews'/f'{name}-{i:03}.png')
            if len(hashes)%30==0:print(f'{name}: processed {len(hashes)}/{end-start}',flush=True)
    finally:
        decoder.stdout.close();encoder.stdin.close()
    assert decoder.wait()==0 and encoder.wait()==0 and len(hashes)==end-start
    # This is the artwork verification, not an unrelated application regression suite.
    with Image.open(temporary) as image:
        assert image.size==(720,1280) and image.n_frames==len(hashes)
        for i,expected in enumerate(hashes):
            image.seek(i);assert pixel_hash(image.convert('RGBA'))==expected,(name,i,'lossless pixel mismatch')
    temporary.replace(dest)
    result=dict(name=name,label=label,source=relative,sourceSha256=digest(source),sourceFrameRange={'first':start,'lastInclusive':end-1},
                frames=len(hashes),fps=24,width=720,height=1280,duration_seconds=len(hashes)/24,
                master='full-resolution/'+dest.name,sha256=digest(dest),bytes=dest.stat().st_size,
                decodedPixelHashes=hashes,losslessPixelVerified=True,audioIncluded=False,
                encoder={'codec':'libwebp_anim','lossless':True,'compressionLevel':0,'compressionEffort':50},
                edgeColorRepairAuthorized=True,**totals)
    record_path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(f'{name}: VERIFIED {len(hashes)} original-size frames, {dest.stat().st_size} bytes, {time.monotonic()-started:.1f}s',flush=True)
    return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--workers',type=int,default=3);args=parser.parse_args()
    for sub in ['full-resolution','verification','previews']:(OUT/sub).mkdir(parents=True,exist_ok=True)
    results={}
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures={executor.submit(process_clip,row):row[0] for row in SOURCES}
        for future in as_completed(futures):results[futures[future]]=future.result()
    manifest=dict(complete=True,policy='Hair detail first: original 720x1280/24fps, closed-form alpha matting, local screen despill, lossless RGBA; source interiors preserved; no output-mask erosion',
                  algorithm={'library':'pymatting 1.1.16','alpha':'closed-form color-line matting','foreground':'multilevel foreground estimation','screenSigma':12,'edgeDespillBandPixels':10,'blueHairGreenFractionCeiling':0.60},
                  clips=[results[row[0]] for row in SOURCES])
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    for record in manifest['clips']:shutil.copy2(OUT/record['master'],ROOT/'pet/anzuki-animation'/(record['name']+'.webp'))
    print('COMPLETE: all 11 clips re-matted, core artwork preserved and every encoded RGBA frame verified.',flush=True)
if __name__=='__main__':main()
