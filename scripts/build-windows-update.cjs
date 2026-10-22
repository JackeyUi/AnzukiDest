'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),current=path.join(root,'.local/windows-release/Anzuki-win32-x64'),baseline=path.join(root,'.local/windows-baseline'),output=path.join(root,'.local/windows-update'),patched=path.join(root,'.local/windows-patched');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function walk(folder,prefix=''){let files=[];for(const entry of await fs.readdir(path.join(folder,prefix),{withFileTypes:true})){const rel=prefix?prefix+'/'+entry.name:entry.name;if(entry.isDirectory())files.push(...await walk(folder,rel));else if(entry.isFile())files.push(rel);}return files.sort();}
(async()=>{
 await fs.access(path.join(baseline,'Anzuki.exe'));await fs.rm(output,{recursive:true,force:true});await fs.mkdir(output,{recursive:true});
 const before=new Set(await walk(baseline)),files=[];
 for(const rel of await walk(current)){
  const bytes=await fs.readFile(path.join(current,rel)),sha=hash(bytes);let oldHash=null;
  if(before.has(rel))oldHash=hash(await fs.readFile(path.join(baseline,rel)));if(oldHash===sha)continue;
  // Runtime changes require explicit inclusion; normal app updates must not silently re-ship it.
  if(!rel.startsWith('resources/app.asar')&&!rel.startsWith('resources/pet/')&&!rel.startsWith('recording-guides/')&&!['asset-manifest.json','READ-ME.txt','LICENSE.Anzuki.txt'].includes(rel))throw Error('Electron runtime changed; review required before creating incremental package: '+rel);
  await fs.mkdir(path.dirname(path.join(output,rel)),{recursive:true});await fs.writeFile(path.join(output,rel),bytes);files.push({path:rel,sha256:sha,previousSha256:oldHash,bytes:bytes.length});
 }
 if(!files.length)throw Error('No changed application files');
 const manifest={schema:1,platform:'win32-x64',baseWorkflowRun:process.env.ANZUKI_BASE_RUN||null,revision:process.env.GITHUB_SHA||null,electronVersion:'43.3.0',files};
 await fs.writeFile(path.join(output,'update-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 await fs.writeFile(path.join(output,'更新說明.txt'),'Anzuki Windows 必要檔案更新包\r\n\r\n1. 先在桌寵右鍵選「結束 Anzuki」。\r\n2. 將本 ZIP 完整解壓到原本 Anzuki.exe 所在資料夾，覆蓋同名檔案。\r\n3. 再執行原本的 Anzuki.exe。\r\n\r\n請保留原有 EXE、DLL、resources/pet 素材與其他檔案。\r\n個人設定與音檔位於 %APPDATA%\\Anzuki\\desktop，不會被此更新覆蓋。\r\n本包僅含以下必要變更：\r\n'+files.map(f=>'- '+f.path).join('\r\n')+'\r\n\r\n本包以最近一次 Windows 發行版為基準；基準與雜湊見 update-manifest.json。\r\n');
 await fs.rm(patched,{recursive:true,force:true});await fs.cp(baseline,patched,{recursive:true});
 for(const f of files)await fs.copyFile(path.join(output,f.path),path.join(patched,f.path));
 for(const rel of await walk(current)){const a=hash(await fs.readFile(path.join(current,rel))),b=hash(await fs.readFile(path.join(patched,rel)));if(a!==b)throw Error('Incremental update does not match full release: '+rel);}
 console.log('UPDATE_FILES '+JSON.stringify(files));console.log('UPDATE_BYTES '+files.reduce((n,f)=>n+f.bytes,0));console.log('PASS applying only changed files to the previous Windows bundle reproduces the complete new release');
})().catch(e=>{console.error(e);process.exitCode=1;});
