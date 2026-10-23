'use strict';
const assert=require('node:assert/strict'),{BehaviorController}=require('../desktop/behavior-controller.js');
const config={idle:'breath',clicks:['click'],animations:{breath:{},drag:{},land:{},start:{},sleep:{},book:{},hat:{},star:{}},behavior:{drag:'drag',land:'land',speeds:{drag:2,land:2},nap:{start:'start',loop:'sleep'},random:{animations:['book','hat','star']}}};
let clock=0,calls=[],pending=[],state;
const player={pause:()=>calls.push({paused:true}),ready:new Set(['click']),setIdle:async(name,o)=>calls.push({name,...o}),stream:(name,o)=>{calls.push({name,...o});return o.loop?Promise.resolve(true):new Promise(resolve=>pending.push({name,resolve}));},click:(name,speed)=>{calls.push({name,speed});return new Promise(resolve=>pending.push({name,resolve}));}};
const c=new BehaviorController(player,config,{idle:'breath',clickSpeed:2,napMinutes:10,actionMinutes:5},{now:()=>clock,random:()=>.5,onState:s=>state=s});
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 clock=299999;c.tick();assert.equal(calls.length,0);
 clock=300000;c.tick();assert.equal(state,'automatic');assert.equal(calls.at(-1).name,'hat');assert.equal(calls.at(-1).speed,1);assert.equal(pending.length,1,'One random action per interval');
 pending.shift().resolve(true);await flush();assert.equal(state,'idle');assert.equal(calls.at(-1).name,'breath');assert.equal(calls.at(-1).fade,true);
 clock=599999;c.activity();clock=600000;c.tick();assert.equal(state,'automatic');pending.shift().resolve(true);await flush();
 c.update({autoEnabled:false});clock=1199999;c.tick();assert.equal(state,'nap-start');assert.equal(calls.at(-1).name,'start');
 clock+=20000;c.activity();assert.equal(state,'nap-start','Mouse movement does not wake a nap');pending.shift().resolve(true);await flush();assert.equal(state,'nap-loop');assert.equal(calls.at(-1).name,'sleep');
 c.tick(clock+3600000);assert.equal(state,'nap-loop','Automatic actions must not interrupt sleep');
 const clicking=c.click();assert.equal(state,'click');assert.equal(calls.at(-1).speed,2);pending.shift().resolve(true);await clicking;assert.equal(state,'idle');
 c.update({clickSpeed:1});c.nap();const obsoleteStart=pending.shift();c.dragStart();assert.equal(state,'drag');assert.equal(calls.at(-1).name,'drag');assert.equal(calls.at(-1).loop,true);assert.equal(calls.at(-1).speed,2,'Drag is 2x independently of click speed');
 c.dragEnd();assert.equal(state,'landing');assert.equal(calls.at(-1).name,'land');assert.equal(calls.at(-1).speed,2);obsoleteStart.resolve(true);await flush();assert.equal(state,'landing','Canceled nap cannot re-enter its loop');
 pending.shift().resolve(true);await flush();assert.equal(state,'idle');
 for(const name of ['drag','land']){const manual=c.manual(name);assert.equal(calls.at(-1).speed,2);assert.equal(calls.at(-1).loop,undefined);pending.shift().resolve(true);await manual;assert.equal(state,'idle');}
 c.manual('book');assert.equal(calls.at(-1).speed,1);const oldManual=pending.shift();c.manual('idle');oldManual.resolve(true);await flush();assert.equal(state,'idle');
 c.update({napMinutes:5,actionMinutes:30,napEnabled:false,autoEnabled:true});clock+=1800000;c.tick();assert.equal(state,'automatic');pending.shift().resolve(true);await flush();
 c.manual('book');const hiddenAction=pending.shift();c.suspend();assert.equal(state,'hidden');assert.equal(calls.at(-1).paused,true);const hiddenCount=calls.length;c.tick(clock+9999999);assert.equal(calls.length,hiddenCount);hiddenAction.resolve(true);await flush();assert.equal(state,'hidden','Hidden pending action must not restart idle');await c.manual('idle');assert.equal(state,'idle');assert.equal(calls.at(-1).name,'breath');
 c.destroy();const count=calls.length;c.tick(clock+9999999);c.manual('nap');assert.equal(calls.length,count);
 console.log('PASS behavior: independent 5–30 minute timers, one random action, nap start/loop, movement cannot wake, pet click/drag wake, hide/restore with stale-completion cancellation, fixed 2x drag/land including manual playback, click-speed independence, interrupted sequence cancellation and faded idle return');
})().catch(e=>{console.error(e);process.exitCode=1;});
