'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{AnimationStore}=require('../desktop/animation-store.cjs'),{inspect}=require('../pet/animation-format.js');
(async()=>{const root=path.resolve(__dirname,'..'),folder=fs.mkdtempSync(path.join(os.tmpdir(),'anzuki-animation-')),source=path.join(root,'pet/anzuki-animation/click-bounce-1.webp'),bytes=fs.readFileSync(source),info=inspect(bytes),base=JSON.parse(fs.readFileSync(path.join(root,'pet/animations.json')));try{
 assert(info.alpha);assert.equal(info.frames,54);assert.equal(info.width,720);assert.equal(info.height,1280);assert.throws(()=>inspect(bytes.subarray(0,bytes.length-1)));assert.throws(()=>inspect(Buffer.alloc(3)));
 const store=new AnimationStore(folder),idle=await store.import(source,'idle'),click=await store.import(source,'click');assert.deepEqual(fs.readFileSync(store.path(idle.id)),bytes);assert.deepEqual(fs.readFileSync(store.path(click.id)),bytes);
 const merged=store.merge(base,click.id);assert(merged.idleOptions.includes(idle.id));assert.deepEqual(merged.clicks,[click.id]);assert(!base.animations[idle.id]);assert.equal(new AnimationStore(folder).items.length,2);
 await assert.rejects(store.import(source,'unknown'));await assert.rejects(store.import(source,'idle',async()=>false));assert.equal(store.items.length,2);
 const opaque=Buffer.from(bytes);opaque[20]&=~16;const bad=path.join(folder,'opaque.webp');fs.writeFileSync(bad,opaque);await assert.rejects(store.import(bad,'idle'),/透明/);
 store.remove(click.id);assert.equal(store.items.length,1);assert.deepEqual(store.merge(base,click.id).clicks,base.clicks);assert.deepEqual(fs.readFileSync(source),bytes);
 console.log('PASS custom animation: transparent WebP metadata, byte-exact imports, idle/click selection, persistence, removal/fallback, invalid and opaque rejection, unchanged built-ins');
}finally{fs.rmSync(folder,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
