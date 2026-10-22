'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {retime}=require('../pet/webp-timing.js');
const root=path.resolve(__dirname,'..'),index=JSON.parse(fs.readFileSync(path.join(root,'pet/animations.json'))),report=[];
assert.deepEqual(index.idleOptions,['idle-loop-long','idle-loop-short']);
assert.deepEqual(index.clickSpeed,{min:1,max:2,step:0.1,default:1});
function durations(bytes){let positions=[],total=0;for(let p=12;p+8<=bytes.length;){const size=bytes.readUInt32LE(p+4);if(bytes.toString('ascii',p,p+4)==='ANMF'){positions.push(p+20);total+=bytes.readUIntLE(p+20,3);}p+=8+size+(size&1);}return {positions,total};}
for(const name of index.clicks){
 const original=fs.readFileSync(path.join(root,'pet/anzuki-animation',index.animations[name].file)),saved=Buffer.from(original),{positions,total}=durations(original);
 for(let tick=10;tick<=20;tick++){
  const speed=tick/10,result=retime(original,speed),modified=Buffer.from(result.bytes),actual=durations(modified);
  assert.equal(result.frames,index.animations[name].frames);assert.equal(result.durationMs,Math.round(total/speed));assert.equal(actual.total,result.durationMs);
  if(speed===1)assert.deepEqual(modified,original);
  for(const p of positions)original.copy(modified,p,p,p+3);
  assert.deepEqual(modified,original,'Only the three duration bytes of each frame may change');
  assert.deepEqual(original,saved,'Original file buffer must stay unchanged');
  report.push({name,speed,durationMs:result.durationMs,sha256:crypto.createHash('sha256').update(result.bytes).digest('hex')});
 }
 for(const bad of [0.9,2.1,1.05,NaN,Infinity])assert.throws(()=>retime(original,bad));
}
if(process.argv.includes('--json'))console.log(JSON.stringify(report));else console.log('PASS playback: 11 speed steps for each click; exact image/alpha bytes preserved; valid long/short idle menu');
