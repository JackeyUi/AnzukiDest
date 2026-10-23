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
    behavior=config['playback'].get('behavior')
    extra=[behavior['drag'],behavior['land'],behavior['nap']['start'],behavior['nap']['loop'],*behavior['random']['animations']] if behavior else []
    names=list(dict.fromkeys([*options,*clicks,*extra]))
    out=ROOT/'android/app/src/main/assets';out.mkdir(parents=True,exist_ok=True)
    for voice_file in ['voice-config.json','voice-lines.json']:shutil.copy2(ROOT/'pet'/voice_file,out/voice_file)
    manifest=json.loads((ROOT/'materials/animation-v2-lossless/manifest.json').read_text())
    verified={c['name']:c for c in manifest['clips']}
    newer=ROOT/'materials/animation-v3/manifest.json'
    if extra:
        added=json.loads(newer.read_text());assert added['complete'], 'New artwork verification is incomplete'
        verified.update({c['name']:c for c in added['clips']})
    trimmed=ROOT/'materials/animation-v4-trim/manifest.json'
    if trimmed.exists():
        added=json.loads(trimmed.read_text());assert added['complete'], 'Trim verification is incomplete'
        verified.update({c['name']:c for c in added['clips']})
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
        animations[name]=dict(file=source.name,sourceFile=source.name,frames=record['frames'],fps=record['fps'],
            durationMs=round(record['frames']/record['fps']*1000),sourceSha256=sha,sha256=sha,losslessPixelVerified=True)
        animations[name]['label']=record.get('label',{'idle-loop-long':'長循環','idle-loop-short':'短循環','click-bounce-1':'點擊彈動一','click-bounce-2':'點擊彈動二'}.get(name,name))
    index=dict(schema=3,revision=revision.hexdigest()[:16],idle=idle,idleOptions=options,clickSpeed=config['playback']['clickSpeed'],clicks=clicks,width=720,height=1280,
        qualityPolicy='Original resolution; RGBA lossless; identical desktop and Android bytes',animations=animations)
    if behavior:index['behavior']=behavior
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
