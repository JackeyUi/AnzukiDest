#!/usr/bin/env python3
"""Build Android animation assets from the same config and WebM files as desktop."""
from pathlib import Path
import hashlib, json, subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
def sync():
    config = json.loads((ROOT/'pet/anzuki-config.json').read_text())
    idle = config['animations']['idle'][0]
    clicks = config['animations']['clicks']
    names = list(dict.fromkeys([idle, *clicks]))
    sources = []
    xmin,ymin,xmax,ymax = 640,360,0,0
    for name in names:
        if not isinstance(name,str) or '/' in name or '\\' in name or name in ['.','..']:
            raise ValueError('Animation name must be a filename stem')
        source = ROOT/'pet/anzuki-animation'/(name+'.webm')
        meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(source)]))['streams'][0]
        if (meta['width'],meta['height']) != (640,360):
            raise ValueError('Expected normalized 640x360 desktop source')
        raw=subprocess.check_output(['ffmpeg','-v','error','-c:v','libvpx-vp9','-i',str(source),
             '-vf','alphaextract','-fps_mode','passthrough','-f','rawvideo','-pix_fmt','gray','-'])
        alpha=np.frombuffer(raw,np.uint8).reshape(-1,360,640)
        yy,xx=np.where(np.any(alpha>16,axis=0))
        xmin=min(xmin,int(xx.min()));xmax=max(xmax,int(xx.max()))
        ymin=min(ymin,int(yy.min()));ymax=max(ymax,int(yy.max()))
        sources.append((name,source,len(alpha)))
    x=max(0,xmin-8);y=max(0,ymin-8)
    width=min(640,xmax+9)-x;height=min(360,ymax+9)-y
    out=ROOT/'android/app/src/main/assets';out.mkdir(parents=True,exist_ok=True)
    revision=hashlib.sha256()
    animations={}
    for name,source,frames in sources:
        dest=out/(name+'.webp')
        subprocess.run(['ffmpeg','-v','error','-y','-c:v','libvpx-vp9','-i',str(source),
            '-vf',f'crop={width}:{height}:{x}:{y},format=rgba', '-an','-c:v','libwebp_anim',
            '-lossless','1','-compression_level','4','-loop','0',str(dest)],check=True)
        source_sha=hashlib.sha256(source.read_bytes()).hexdigest()
        revision.update(name.encode());revision.update(source_sha.encode())
        animations[name]={'file':dest.name,'frames':frames,'fps':24,'durationMs':round(frames/24*1000),
                          'sourceSha256':source_sha,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
    index={'schema':1,'revision':revision.hexdigest()[:16], 'idle':idle,'clicks':clicks,
           'width':width,'height':height,'desktopCrop':[x,y,width,height],'animations':animations}
    (out/'animations.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
    desired={v['file'] for v in animations.values()}
    for p in out.glob('*.webp'):
        if p.name not in desired:p.unlink()
    print(json.dumps({'androidAssetRevision':index['revision'],'crop':index['desktopCrop'],
                      'animations':list(animations)},ensure_ascii=False))
    return index
if __name__=='__main__':sync()
