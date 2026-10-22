'use strict';
const crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
// Compare actual code/data and resource leaves, ignoring PE packaging timestamps/checksums.
// A changed icon, manifest, version resource or executable section still changes this fingerprint.
function fingerprint(bytes,{ignoreUnenforcedAsarMetadata=false}={}){
 const pe=bytes.readUInt32LE(0x3c);if(bytes.toString('ascii',pe,pe+4)!=='PE\0\0')throw Error('Invalid PE executable');
 const count=bytes.readUInt16LE(pe+6),optional=pe+24,optionalBytes=bytes.readUInt16LE(pe+20),magic=bytes.readUInt16LE(optional),sections=[];
 if(magic!==0x20b)throw Error('Expected Windows x64 PE');
 for(let i=0;i<count;i++){const p=optional+optionalBytes+i*40;sections.push({name:bytes.toString('ascii',p,p+8).replace(/\0/g,''),virtualSize:bytes.readUInt32LE(p+8),rva:bytes.readUInt32LE(p+12),size:bytes.readUInt32LE(p+16),raw:bytes.readUInt32LE(p+20)});}
 const rvaToOffset=rva=>{const s=sections.find(s=>rva>=s.rva&&rva<s.rva+Math.max(s.virtualSize,s.size));if(!s)throw Error('Invalid PE resource address');return s.raw+rva-s.rva;};
 const resourceRva=bytes.readUInt32LE(optional+112+2*8),resourceBase=rvaToOffset(resourceRva),leaves=[];
 function visit(relative,parts,seen){
  if(seen.has(relative))throw Error('Cyclic PE resource directory');const next=new Set(seen);next.add(relative);const p=resourceBase+relative,n=bytes.readUInt16LE(p+12)+bytes.readUInt16LE(p+14);
  for(let i=0;i<n;i++){const at=p+16+i*8,name=bytes.readUInt32LE(at),target=bytes.readUInt32LE(at+4);let key;
   if(name&0x80000000){const q=resourceBase+(name&0x7fffffff),length=bytes.readUInt16LE(q);key='str:'+bytes.toString('utf16le',q+2,q+2+length*2);}else key='id:'+name;
   const keys=[...parts,key];if(target&0x80000000)visit(target&0x7fffffff,keys,next);
   else{const q=resourceBase+target,offset=rvaToOffset(bytes.readUInt32LE(q)),size=bytes.readUInt32LE(q+4),codePage=bytes.readUInt32LE(q+8);if(offset+size>bytes.length)throw Error('Truncated PE resource');const key=keys.join('/'),payload=bytes.subarray(offset,offset+size);
    if(ignoreUnenforcedAsarMetadata&&keys[0]==='str:INTEGRITY'&&keys[1]==='str:ELECTRONASAR'){
     const records=JSON.parse(payload.toString('utf8'));if(!Array.isArray(records)||records.length!==1||records[0].file.replace(/\\/g,'/')!=='resources/app.asar'||records[0].alg!=='SHA256'||!/^[a-f0-9]{64}$/.test(records[0].value))throw Error('Unexpected embedded ASAR metadata');
    }else leaves.push({path:key,codePage,bytes:size,sha256:sha(payload)});}
  }
 }
 visit(0,[],new Set());leaves.sort((a,b)=>a.path.localeCompare(b.path));
 return {machine:bytes.readUInt16LE(pe+4),entry:bytes.readUInt32LE(optional+16),imageBase:bytes.readBigUInt64LE(optional+24).toString(),sections:sections.filter(s=>s.name!=='.rsrc').map(s=>({name:s.name,rva:s.rva,sha256:sha(bytes.subarray(s.raw,s.raw+s.size))})),resources:leaves};
}
module.exports={fingerprint};
