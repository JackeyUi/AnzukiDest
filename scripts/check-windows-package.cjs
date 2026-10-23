'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),folder=path.resolve(process.argv[2]||path.join(root,'.local/windows-release/Anzuki-win32-x64'));
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'asset-manifest.json'))),index=JSON.parse(fs.readFileSync(path.join(root,'pet/animations.json'))),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(fs.readFileSync(path.join(folder,'Anzuki.exe')).subarray(0,2).toString(),'MZ');assert.equal(manifest.assetRevision,index.revision);
for(const [file,record] of Object.entries(manifest.assets)){const source=fs.readFileSync(path.join(root,'pet',file)),packaged=fs.readFileSync(path.join(folder,'resources/pet',file));assert.equal(sha(source),record.sha256);assert.equal(sha(packaged),record.sha256);assert.equal(packaged.length,record.bytes);}
assert.deepEqual(fs.readFileSync(path.join(folder,'CUSTOM-ANIMATIONS.md')),fs.readFileSync(path.join(root,'CUSTOM-ANIMATIONS.md')));
assert.deepEqual(fs.readFileSync(path.join(folder,'ANIMATION-BEHAVIORS.md')),fs.readFileSync(path.join(root,'ANIMATION-BEHAVIORS.md')));
assert.deepEqual(fs.readFileSync(path.join(folder,'LICENSE.Anzuki.txt')),fs.readFileSync(path.join(root,'LICENSE')));
for(const name of fs.readdirSync(path.join(root,'materials/voice-v1')))assert.deepEqual(fs.readFileSync(path.join(folder,'recording-guides',name)),fs.readFileSync(path.join(root,'materials/voice-v1',name)));
const asar=require(path.join(root,'.local/windows-tools/node_modules/@electron/asar'));
for(const name of fs.readdirSync(path.join(root,'desktop'))){const p=path.join(root,'desktop',name);if(fs.statSync(p).isFile())assert.deepEqual(asar.extractFile(path.join(folder,'resources/app.asar'),name),fs.readFileSync(p),'Packaged desktop source mismatch: '+name);}
console.log('PASS Windows executable, packaged app code, every original-resolution artwork byte, voice catalog and playback config');
