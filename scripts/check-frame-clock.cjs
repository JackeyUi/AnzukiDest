'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {timeline,frameAt}=require('../desktop/frame-player.js'),{retime}=require('../pet/webp-timing.js');
const root=path.resolve(__dirname,'..'),index=JSON.parse(fs.readFileSync(path.join(root,'pet/animations.json')));
const cases=[...index.clicks.map(name=>({name,speeds:Array.from({length:11},(_,i)=>1+i/10)})),...Object.entries(index.behavior.speeds).map(([name,speed])=>({name,speeds:[speed]}))];
assert.deepEqual(index.behavior.speeds,{'drag-held':2,land:2});
for(const {name,speeds} of cases){
 const input=fs.readFileSync(path.join(root,'pet/anzuki-animation',name+'.webp')),saved=Buffer.from(input),clock=timeline(input);assert.equal(clock.starts.length,index.animations[name].frames);
 for(const speed of speeds){
  const seen=new Set();for(let elapsed=0;elapsed<clock.durationMs/speed;elapsed+=1000/60)seen.add(frameAt(clock.starts,elapsed*speed));
  assert.equal(seen.size,clock.starts.length,'Every source frame must be reachable at 60 Hz for speed '+speed);
  assert(Math.abs(clock.durationMs/speed-retime(input,speed).durationMs)<=.5);assert.equal(frameAt(clock.starts,-1),0);assert.equal(frameAt(clock.starts,clock.durationMs+1000),clock.starts.length-1);
 }
 assert.deepEqual(input,saved);
}
console.log('PASS decoded frame clock: exact source durations, 11 click speeds and fixed 2x drag/land, all source frames at nominal 60 Hz, no source mutation');
