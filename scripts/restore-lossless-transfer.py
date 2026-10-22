#!/usr/bin/env python3
"""Reassemble byte-exact GitHub transfer parts; never transcode artwork."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[1]
transfer=ROOT/'.transfer-lossless'
for item in json.loads((transfer/'manifest.json').read_text()):
    dest=(ROOT/item['path']).resolve()
    assert dest.is_relative_to(ROOT) and item['path'].startswith(('materials/animation-v2-lossless/full-resolution/','android/releases/'))
    dest.parent.mkdir(parents=True,exist_ok=True)
    with dest.open('wb') as output:
        for part in item['parts']:
            p=(ROOT/part['path']).resolve();assert p.is_relative_to(transfer)
            data=p.read_bytes()
            assert len(data)==part['bytes'] and hashlib.sha256(data).hexdigest()==part['sha256']
            output.write(data)
    assert dest.stat().st_size==item['bytes'] and hashlib.sha256(dest.read_bytes()).hexdigest()==item['sha256']
    print('Restored exact bytes:',item['path'])
for p in (ROOT/'materials/animation-v2-lossless/full-resolution').glob('*.webp'):
    shutil.copy2(p,ROOT/'pet/anzuki-animation'/p.name)
index=json.loads((ROOT/'pet/animations.json').read_text())
for animation in index['animations'].values():
    p=ROOT/'pet/anzuki-animation'/animation['file']
    shutil.copy2(p,ROOT/'android/app/src/main/assets'/p.name)
shutil.rmtree(transfer)
