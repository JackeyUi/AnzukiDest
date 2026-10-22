#!/usr/bin/env python3
"""Full-resolution RGBA lossless pipeline. Never resize, subsample or use lossy codecs."""
from pathlib import Path
import hashlib,json,subprocess,sys,shutil,uuid
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
ORIGINAL=ROOT/'materials/animation-v1/original'
MATERIALS=ROOT/'materials/animation-v2-lossless'
MASTERS=MATERIALS/'full-resolution'
RUNTIME=ROOT/'pet/anzuki-animation'
WIDTH,HEIGHT,FPS=720,1280,24
CLIPS=[
 ('idle-loop-long','video2_loop_long.mp4',0,94,'normal idle; whole loop_long'),
 ('idle-loop-short','video2_loop_short.mp4',0,60,'alternate idle; whole loop_short'),
 ('click-bounce-1','gemini_generated_video_1019414a.mp4',6,60,'first in-place bounce'),
 ('click-bounce-2','gemini_generated_video_1019414a.mp4',72,128,'second in-place bounce'),
]

def key_frame(frame):
    rgb=frame.astype(np.float32)
    excess=rgb[...,1]-np.maximum(rgb[...,0],rgb[...,2])
    t=np.clip((excess-12.)/73.,0,1)
    alpha=1.-t*t*(3.-2.*t)
    border=np.concatenate((rgb[:16].reshape(-1,3),rgb[-16:].reshape(-1,3)))
    screen=np.median(border,axis=0)
    clean=np.clip((rgb-screen[None,None,:]*(1-alpha[...,None]))/np.maximum(alpha,.025)[...,None],0,255)
    edge=(alpha<.999)&(excess>0)
    clean[...,1]=np.where(edge,np.minimum(clean[...,1],np.maximum(clean[...,0],clean[...,2])),clean[...,1])
    # Fully opaque original pixels are never recolored or altered.
    clean[alpha>=.999]=rgb[alpha>=.999]
    clean[alpha<.01]=0;alpha[alpha<.01]=0
    return np.dstack((clean,alpha*255)).round().astype(np.uint8)

def pixel_hash(rgba):
    a=np.array(rgba,dtype=np.uint8,copy=True)
    a[a[...,3]==0,:3]=0  # invisible RGB beneath alpha=0 is not image content
    return hashlib.sha256(a.tobytes()).hexdigest()

def encode_clip(name,source,start,end,purpose):
    decoder=subprocess.Popen(['ffmpeg','-v','error','-i',str(ORIGINAL/source),
       '-vf',f'trim=start_frame={start}:end_frame={end},setpts=PTS-STARTPTS',
       '-an','-fps_mode','passthrough','-pix_fmt','rgb24','-f','rawvideo','-'],stdout=subprocess.PIPE)
    dest=MASTERS/(name+'.webp')
    temporary=MASTERS/(name+'.'+uuid.uuid4().hex+'.webp')
    encoder=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pixel_format','rgba',
       '-video_size',f'{WIDTH}x{HEIGHT}','-framerate',str(FPS),'-i','-',
       '-an','-c:v','libwebp_anim','-lossless','1','-quality','100','-compression_level','0',
       '-loop','0','-pix_fmt','bgra',str(temporary)],stdin=subprocess.PIPE)
    expected=[];opaque_changed=0
    try:
      while True:
        raw=decoder.stdout.read(WIDTH*HEIGHT*3)
        if not raw:break
        if len(raw)!=WIDTH*HEIGHT*3:raise RuntimeError('Incomplete source frame')
        rgb=np.frombuffer(raw,np.uint8).reshape(HEIGHT,WIDTH,3)
        rgba=key_frame(rgb)
        opaque=rgba[...,3]==255
        opaque_changed+=int(np.count_nonzero(np.any(rgba[...,:3][opaque]!=rgb[opaque],axis=-1)))
        expected.append(pixel_hash(rgba));encoder.stdin.write(rgba.tobytes())
    finally:
      decoder.stdout.close();encoder.stdin.close()
    if decoder.wait() or encoder.wait():raise RuntimeError('FFmpeg failed')
    if len(expected)!=end-start:raise RuntimeError('Frame count changed')
    with Image.open(temporary) as im:
      assert im.size==(WIDTH,HEIGHT), 'Resolution changed'
      assert im.n_frames==len(expected), 'Frames dropped or duplicated'
      for i,h in enumerate(expected):
        im.seek(i)
        if pixel_hash(im.convert('RGBA'))!=h:raise RuntimeError(f'Lossless pixel mismatch: {name}, frame {i}')
    assert opaque_changed==0, 'Opaque character colors changed during keying'
    temporary.replace(dest)
    shutil.copy2(dest,RUNTIME/dest.name)
    result=dict(name=name,source=source,start_frame=start,end_frame_exclusive=end,
       start_seconds=start/FPS,end_seconds=end/FPS,frames=len(expected),fps=FPS,
       duration_seconds=len(expected)/FPS,purpose=purpose,
       width=WIDTH,height=HEIGHT,format='animated WebP / RGBA lossless',
       master='full-resolution/'+dest.name,runtime='../../pet/anzuki-animation/'+dest.name,
       sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
       decodedPixelHashes=expected,losslessPixelVerified=True,opaquePixelsChanged=opaque_changed)
    print(f'{name}: {len(expected)} exact RGBA frames, {dest.stat().st_size} bytes',flush=True)
    return result

def main():
    MASTERS.mkdir(parents=True,exist_ok=True);RUNTIME.mkdir(parents=True,exist_ok=True)
    clips=[encode_clip(*row) for row in CLIPS]
    inputs=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())
      for p in sorted(ORIGINAL.glob('*.mp4'))]
    manifest=dict(policy='Artwork first: no downscaling, no lossy recompression, no chroma subsampling',
      width=WIDTH,height=HEIGHT,fps=FPS,color='RGBA 8-bit, no YUV conversion after keying',
      key=dict(greenExcessLow=12,greenExcessHigh=85,opaqueRGBPreserved=True),
      originals=inputs,clips=clips)
    (MATERIALS/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    subprocess.run([sys.executable,ROOT/'scripts/sync-android-assets.py'],check=True)
if __name__=='__main__':main()
