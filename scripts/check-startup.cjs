'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {FramePlayer}=require('../desktop/frame-player.js');
const bytes=Buffer.from(fs.readFileSync(path.join(__dirname,'fixtures/custom-animation.webp.b64'),'utf8'),'base64');
const saved={document:global.document,ImageDecoder:global.ImageDecoder,createImageBitmap:global.createImageBitmap,requestAnimationFrame:global.requestAnimationFrame,cancelAnimationFrame:global.cancelAnimationFrame,error:console.error};
let decoderNumber=0,closed=0,painted=0;const errors=[];
global.document={createElement:()=>({width:0,height:0,setAttribute(){},getContext:()=>({clearRect(){},drawImage(){}})})};
global.ImageDecoder=class{constructor(){this.number=++decoderNumber;this.tracks={ready:Promise.resolve()};this.completed=Promise.resolve();}async decode(){if(this.number===1)throw Error('first frame cannot decode');return {image:{width:32,height:64,close(){}}};}close(){closed++;}};
global.createImageBitmap=async image=>({width:image.width,height:image.height,close(){}});global.requestAnimationFrame=()=>1;global.cancelAnimationFrame=()=>{};console.error=(...args)=>errors.push(args);
const holder={dataset:{},replaceChildren(node){this.firstChild=node;}},player=new FramePlayer(holder,{idle:'broken',width:32,height:64,animations:{broken:{},builtin:{}},clicks:[]},async()=>bytes,()=>painted++);
(async()=>{
 try{assert.equal(await player.setIdle('broken'),false,'A failed first frame must not report successful startup');assert.equal(painted,0);assert.equal(await player.setIdle('builtin',{force:true,fade:false}),true);assert.equal(painted,1);assert.equal(holder.dataset.animation,'builtin');assert(errors.length>0);}
 finally{player.destroy();assert(closed>=2);for(const key of Object.keys(saved))if(key!=='error')global[key]=saved[key];console.error=saved.error;}
 console.log('PASS startup: first-frame decode failure is reported, no false ready signal, built-in recovery can paint, decoders cleaned up');
})().catch(error=>{console.error= saved.error;console.error(error);process.exitCode=1;});
