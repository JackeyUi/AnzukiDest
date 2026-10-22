#!/usr/bin/env python3
"""Verify Android assets and packaged APK match current desktop animation config."""
from pathlib import Path
import argparse,hashlib,json,zipfile

ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--assets-only',action='store_true');args=parser.parse_args()
    config=json.loads((ROOT/'pet/anzuki-config.json').read_text())
    folder=ROOT/'android/app/src/main/assets';index=json.loads((folder/'animations.json').read_text())
    assert index['idle']==config['animations']['idle'][0], 'Android idle differs from desktop'
    assert index['clicks']==config['animations']['clicks'], 'Android click pool differs from desktop'
    revision=hashlib.sha256()
    for name in dict.fromkeys([index['idle'],*index['clicks']]):
        source=ROOT/'pet/anzuki-animation'/(name+'.webm');source_sha=hashlib.sha256(source.read_bytes()).hexdigest()
        revision.update(name.encode());revision.update(source_sha.encode())
        record=index['animations'][name]
        assert record['sourceSha256']==source_sha, 'Stale Android source: '+name
        assert hashlib.sha256((folder/record['file']).read_bytes()).hexdigest()==record['sha256'], 'Corrupt Android animation: '+name
    assert index['revision']==revision.hexdigest()[:16], 'Asset revision mismatch'
    if not args.assets_only:
        apk=ROOT/'android/releases/Anzuki-Android.apk'
        metadata=json.loads((apk.parent/'apk-metadata.json').read_text())
        assert metadata['assetRevision']==index['revision'], 'Rebuild Android APK after changing desktop animations'
        assert metadata['sha256']==hashlib.sha256(apk.read_bytes()).hexdigest(), 'APK hash mismatch'
        with zipfile.ZipFile(apk) as z:
            assert z.testzip() is None
            for p in folder.iterdir():
                if p.is_file():assert z.read('assets/'+p.name)==p.read_bytes(), 'Packaged asset mismatch: '+p.name
    print('PASS desktop + Android synchronization: '+index['revision'])
if __name__=='__main__':main()
