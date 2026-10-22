// Reconstruct the original signed APK from exact stored bytes. No encoding or SDK.
import {readFile,open,rename,mkdir,unlink} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),folder=join(root,'android/releases/packaging');
const recipe=JSON.parse(await readFile(join(folder,'manifest.json'),'utf8')),literal=await readFile(join(folder,'literals.bin'));
const sha=b=>createHash('sha256').update(b).digest('hex');
if(sha(literal)!==recipe.literalSha256)throw new Error('Release metadata bytes do not match');
const output=join(root,'android/releases/Anzuki-Android.apk'),temporary=output+'.new';await mkdir(dirname(output),{recursive:true});
const file=await open(temporary,'w'),hash=createHash('sha256');let count=0;
try{
 for(const p of recipe.parts){
  let data;if(p.kind==='literal')data=literal.subarray(p.offset,p.offset+p.length);
  else{
   if(p.kind!=='artwork'||!/^pet\/anzuki-animation\/[a-z0-9-]+\.webp$/.test(p.path))throw new Error('Invalid artwork reference');
   data=await readFile(join(root,p.path));if(sha(data)!==p.sha256)throw new Error('Artwork does not match: '+p.path);
  }
  if(data.length!==p.length)throw new Error('Truncated release component');await file.writeFile(data);hash.update(data);count+=data.length;
 }
 if(count!==recipe.apkBytes||hash.digest('hex')!==recipe.apkSha256)throw new Error('Restored APK hash does not match');
}catch(error){await file.close();await unlink(temporary).catch(()=>{});throw error;}
await file.close();await rename(temporary,output);console.log('Signed APK restored byte-for-byte: '+output);
