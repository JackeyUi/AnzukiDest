'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),tools=path.join(root,'.local','windows-tools','node_modules');
const packager=require(path.join(tools,'@electron','packager'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const staging=path.join(root,'.local','windows-staging'),pet=path.join(staging,'pet');
 await fs.rm(staging,{recursive:true,force:true});await fs.mkdir(path.join(pet,'anzuki-animation'),{recursive:true});
 const index=JSON.parse(await fs.readFile(path.join(root,'pet','animations.json'),'utf8')),files=['animations.json','anzuki-config.json','voice-config.json','voice-lines.json','voice-rules.js','webp-timing.js','animation-format.js',...Object.values(index.animations).map(a=>'anzuki-animation/'+a.file)];
 const assets={};
 for(const file of files){const data=await fs.readFile(path.join(root,'pet',file));await fs.writeFile(path.join(pet,file),data);assets[file]={sha256:hash(data),bytes:data.length};}
 const outputs=await packager({dir:path.join(root,'desktop'),name:'Anzuki',platform:'win32',arch:'x64',electronVersion:'43.3.0',out:path.join(root,'.local','windows-release'),overwrite:true,asar:true,extraResource:[pet],appCopyright:'Anzuki character and media belong to their respective rights holders',win32metadata:{CompanyName:'AnzukiDest',FileDescription:'Anzuki desktop companion',ProductName:'Anzuki'}});
 for(const output of outputs){
  await fs.copyFile(path.join(root,'CUSTOM-ANIMATIONS.md'),path.join(output,'CUSTOM-ANIMATIONS.md'));
  await fs.copyFile(path.join(root,'ANIMATION-BEHAVIORS.md'),path.join(output,'ANIMATION-BEHAVIORS.md'));
  await fs.copyFile(path.join(root,'LICENSE'),path.join(output,'LICENSE.Anzuki.txt'));
  await fs.cp(path.join(root,'materials/voice-v1'),path.join(output,'recording-guides'),{recursive:true});
  await fs.writeFile(path.join(output,'asset-manifest.json'),JSON.stringify({platform:'win32-x64',artwork:'720x1280 lossless RGBA; original asset bytes preserved',assetRevision:index.revision,assets},null,2)+'\n');
  await fs.writeFile(path.join(output,'READ-ME.txt'),'Anzuki Windows 10/11 x64\r\n\r\n1. Extract this entire folder.\r\n2. Run Anzuki.exe. Node.js is not required.\r\n3. Right-click the pet to configure animation and recorded voice.\r\n\r\nKeep resources and all DLLs beside the EXE.\r\nSettings and imported recordings: %APPDATA%\\Anzuki\\desktop\r\nOriginal 720x1280 lossless artwork is included unchanged.\r\nRecording scripts (including Japanese): recording-guides/\r\nNo official voice recordings are included yet.\r\n');
  console.log('Windows package:',output);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
