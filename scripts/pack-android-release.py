#!/usr/bin/env python3
"""Package a byte-exact signed APK using shared artwork references; no media encoding."""
from pathlib import Path
import zipfile,struct,hashlib,json
r=Path(__file__).resolve().parents[1];apk=r/'android/releases/Anzuki-Android.apk';raw=apk.read_bytes();out=r/'android/releases/packaging';out.mkdir(exist_ok=True)
assets=[]
with zipfile.ZipFile(apk) as z:
 for info in z.infolist():
  if info.filename.endswith('.webp'):
   assert info.compress_type==zipfile.ZIP_STORED
   namesize,extra=struct.unpack_from('<HH',raw,info.header_offset+26);start=info.header_offset+30+namesize+extra
   path='pet/anzuki-animation/'+Path(info.filename).name;data=(r/path).read_bytes();assert raw[start:start+info.file_size]==data
   assets.append((start,start+info.file_size,path,hashlib.sha256(data).hexdigest()))
parts=[];literal=bytearray();cursor=0
for start,end,path,sha in sorted(assets):
 if start>cursor:
  parts.append(dict(kind='literal',offset=len(literal),length=start-cursor));literal.extend(raw[cursor:start])
 parts.append(dict(kind='artwork',path=path,length=end-start,sha256=sha));cursor=end
if cursor<len(raw):parts.append(dict(kind='literal',offset=len(literal),length=len(raw)-cursor));literal.extend(raw[cursor:])
(out/'literals.bin').write_bytes(literal)
(out/'manifest.json').write_text(json.dumps(dict(apkBytes=len(raw),apkSha256=hashlib.sha256(raw).hexdigest(),literalSha256=hashlib.sha256(literal).hexdigest(),parts=parts),indent=2)+'\n')
print('Transfer literal bytes:',len(literal),'unchanged artwork bytes reused:',sum(e-s for s,e,_,_ in assets))
