#!/usr/bin/env python3
"""Copy identical original-resolution, lossless RGBA assets to Android. No encoding."""
from pathlib import Path
import hashlib,json,shutil
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
def sync():
    config=json.loads((ROOT/'pet/anzuki-config.json').read_text())
    idle=config['animations']['idle'][0];clicks=config['animations']['clicks']
    options=config['playback']['idleOptions']
    assert idle in options
    names=list(dict.fromkeys([*options,*clicks]))
    out=ROOT/'android/app/src/main/assets';out.mkdir(parents=True,exist_ok=True)
    manifest=json.loads((ROOT/'materials/animation-v2-lossless/manifest.json').read_text())
    verified={c['name']:c for c in manifest['clips']}
    animations={};revision=hashlib.sha256()
    for name in names:
        if '/' in name or '\\' in name:raise ValueError('Invalid animation stem')
        source=ROOT/'pet/anzuki-animation'/(name+'.webp')
        data=source.read_bytes();sha=hashlib.sha256(data).hexdigest();record=verified[name]
        assert sha==record['sha256'] and record['losslessPixelVerified'], 'Unverified source '+name
        with Image.open(source) as im:
            assert im.size==(720,1280) and im.n_frames==record['frames']
        shutil.copy2(source,out/source.name)
        assert (out/source.name).read_bytes()==data
        revision.update(name.encode());revision.update(sha.encode())
        animations[name]=dict(file=source.name,sourceFile=source.name,frames=record['frames'],fps=24,
            durationMs=round(record['frames']/24*1000),sourceSha256=sha,sha256=sha,losslessPixelVerified=True)
    index=dict(schema=3,revision=revision.hexdigest()[:16],idle=idle,idleOptions=options,clickSpeed=config['playback']['clickSpeed'],clicks=clicks,width=720,height=1280,
        qualityPolicy='Original resolution; RGBA lossless; identical desktop and Android bytes',animations=animations)
    (out/'animations.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
    # Desktop uses the same index and exact same source images.
    (ROOT/'pet/animations.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'preview-config.js').write_text('window.ANZUKI_ASSETS='+json.dumps(index,ensure_ascii=False)+';\n')
    desired={a['file'] for a in animations.values()}
    for p in out.glob('*.webp'):
        if p.name not in desired:p.unlink()
    print('Desktop + Android full-resolution asset revision: '+index['revision'])
    return index
if __name__=='__main__':sync()
