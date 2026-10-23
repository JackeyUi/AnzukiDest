#!/usr/bin/env python3
"""Key the added source clips into exact original-size RGBA, then verify every frame."""
from pathlib import Path
import hashlib, importlib.util, json, shutil, subprocess
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
FOLDER=ROOT/'materials/animation-v3'
spec=importlib.util.spec_from_file_location('original_pipeline',ROOT/'scripts/process-videos.py')
pipeline=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipeline)
CLIPS=[('drag-held','抓起.mp4','抓起'),('land','落地_裁切.mp4','落地'),
 ('nap-start','小憩_start.mp4','小憩開始'),('nap-loop','小憩_loop.mp4','小憩循環'),
 ('read-book','拿書.mp4','拿書'),('adjust-hat','扶帽子.mp4','扶帽子'),('catch-star','抓星星.mp4','抓星星')]

def main():
 records=[];originals=[]
 (FOLDER/'full-resolution').mkdir(parents=True,exist_ok=True)
 for name,filename,label in CLIPS:
  source=FOLDER/'original'/filename
  info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(source)]))
  stream=next(s for s in info['streams'] if s['codec_type']=='video')
  width,height=stream['width'],stream['height'];assert (width,height)==(720,1280)
  assert stream['r_frame_rate']=='24/1'
  expected=[];opaque_changed=0;dest=FOLDER/'full-resolution'/(name+'.webp')
  decoder=subprocess.Popen(['ffmpeg','-v','error','-i',str(source),'-map','0:v:0','-an','-fps_mode','passthrough','-pix_fmt','rgb24','-f','rawvideo','-'],stdout=subprocess.PIPE)
  encoder=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size',f'{width}x{height}','-framerate','24','-i','-','-an','-c:v','libwebp_anim','-lossless','1','-quality','100','-compression_level','4','-loop','0','-pix_fmt','bgra',str(dest)],stdin=subprocess.PIPE)
  try:
   while True:
    raw=decoder.stdout.read(width*height*3)
    if not raw:break
    assert len(raw)==width*height*3
    rgb=np.frombuffer(raw,np.uint8).reshape(height,width,3);rgba=pipeline.key_frame(rgb)
    opaque=rgba[...,3]==255
    opaque_changed+=int(np.count_nonzero(np.any(rgba[...,:3][opaque]!=rgb[opaque],axis=-1)))
    expected.append(pipeline.pixel_hash(rgba));encoder.stdin.write(rgba.tobytes())
  finally:decoder.stdout.close();encoder.stdin.close()
  assert decoder.wait()==0 and encoder.wait()==0
  assert len(expected)==int(stream['nb_frames']) and opaque_changed==0
  with Image.open(dest) as im:
   assert im.size==(width,height) and im.n_frames==len(expected)
   for i,value in enumerate(expected):
    im.seek(i);assert pipeline.pixel_hash(im.convert('RGBA'))==value,(name,i)
  digest=hashlib.sha256(dest.read_bytes()).hexdigest()
  shutil.copy2(dest,ROOT/'pet/anzuki-animation'/dest.name)
  records.append(dict(name=name,label=label,source=filename,frames=len(expected),fps=24,width=width,height=height,
   duration_seconds=len(expected)/24,master='full-resolution/'+dest.name,sha256=digest,
   decodedPixelHashes=expected,losslessPixelVerified=True,opaquePixelsChanged=0,audioIncluded=False))
  originals.append(dict(file=filename,bytes=source.stat().st_size,sha256=hashlib.sha256(source.read_bytes()).hexdigest(),audioTracks=sum(s['codec_type']=='audio' for s in info['streams'])))
  # Save verified progress without accepting an incomplete manifest as the final set.
  (FOLDER/'manifest.json').write_text(json.dumps(dict(policy='Original-size 24 fps lossless RGBA; source MP4 unchanged; no animation audio',complete=len(records)==len(CLIPS),originals=originals,clips=records),ensure_ascii=False,indent=2)+'\n')
  print(f'{name}: {len(expected)} verified frames, {dest.stat().st_size} bytes, opaque RGB unchanged',flush=True)
if __name__=='__main__':main()
