'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {eligible}=require('../pet/voice-rules.js'),{VoiceStore}=require('../desktop/voice-store.cjs'),{VoicePlayer}=require('../desktop/voice-player.js');
const root=path.resolve(__dirname,'..'),policy=JSON.parse(fs.readFileSync(path.join(root,'pet/voice-config.json'))),catalog=JSON.parse(fs.readFileSync(path.join(root,'pet/voice-lines.json')));
(async()=>{
 assert.equal(catalog.lines.length,14);assert.equal(new Set(catalog.lines.map(l=>l.id)).size,14);
 const snapshot={policy,catalog,settings:{...policy.defaults},clips:{greeting:[],click:[],idle:[]}};
 for(const line of catalog.lines){assert(policy.events.some(e=>e.id===line.event));assert(line.text.trim());snapshot.clips[line.event].push({id:line.id,lineId:line.id,name:line.id,url:'file:///test.wav'});}
 const weekdays=['weekday','weekday','weekday','weekday','weekday','holiday','holiday'];
 for(let day=0;day<7;day++)for(let hour=0;hour<24;hour++){
  const date=new Date(2026,9,19+day,hour);assert.equal(date.getDay()||7,day+1);
  const period=hour<5||hour>=22?'night':hour<11?'morning':hour<14?'noon':hour<18?'afternoon':'evening';
  assert.deepEqual(eligible(snapshot,'greeting',date).map(c=>c.id),[hour>=5&&hour<11?'greeting-'+weekdays[day]+'-morning':'greeting-'+period]);
  assert.deepEqual(eligible(snapshot,'click',date).map(c=>c.id),['click-'+period]);assert.deepEqual(eligible(snapshot,'idle',date).map(c=>c.id),['idle-'+weekdays[day]]);
 }
 const missing=structuredClone(snapshot);missing.clips.greeting=missing.clips.greeting.filter(c=>c.id!=='greeting-weekday-morning');assert.equal(eligible(missing,'greeting',new Date(2026,9,19,8))[0].id,'greeting-morning');
 missing.clips.click=[snapshot.clips.click.find(c=>c.id==='click-morning')];assert.equal(eligible(missing,'click',new Date(2026,9,19,23)).length,0);
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'anzuki-voice-'));
 try{
  const source=path.join(folder,'click-night.wav'),bytes=Buffer.from('byte-exact audio copy test');fs.writeFileSync(source,bytes);
  const store=new VoiceStore(path.join(folder,'data'),policy,catalog);assert.deepEqual(await store.import('click',[source],{dayType:'weekday',period:'night'}),[]);
  const clip=store.snapshot().clips.click[0];assert.equal(clip.lineId,'generic');assert.deepEqual(clip.schedule,{dayType:'weekday',period:'night'});assert.deepEqual(fs.readFileSync(path.join(store.folder,clip.file)),bytes);
  const arbitrary=path.join(folder,'我隨便取的名字.FLAC');fs.writeFileSync(arbitrary,bytes);assert.deepEqual(await store.import('idle',[arbitrary],{dayType:'holiday',period:'all'}),[]);
  const imported=store.snapshot().clips.idle[0];assert.deepEqual(fs.readFileSync(path.join(store.folder,imported.file)),bytes);
  assert.equal(eligible(store.snapshot(),'idle',new Date(2026,9,24,8))[0].id,imported.id);assert.equal(eligible(store.snapshot(),'idle',new Date(2026,9,23,8)).length,0);
  store.setSchedule(imported.id,{dayType:'weekday',period:'night'});assert.equal(eligible(store.snapshot(),'idle',new Date(2026,9,23,23))[0].id,imported.id);assert.equal(eligible(store.snapshot(),'idle',new Date(2026,9,24,0)).length,0);
  assert.equal((await store.import('idle',[arbitrary],{dayType:'all',period:'all'},async()=>false)).length,1);assert.equal(store.snapshot().clips.idle.length,1);
  const video=path.join(folder,'不能匯入.MP4');fs.writeFileSync(video,bytes);assert.equal((await store.import('idle',[video],{dayType:'all',period:'all'})).length,1);assert.equal(eligible({...snapshot,clips:{...snapshot.clips,click:[{id:'video',lineId:'generic',name:'old.webm'}]}},'click').length,0);
  assert.throws(()=>store.setSchedule(imported.id,{dayType:'monday',period:'all'}));
  const legacy={...snapshot,clips:{...snapshot.clips,greeting:[{id:'old',lineId:'greeting-mon-morning'}]}};assert.equal(eligible(legacy,'greeting',new Date(2026,9,19,8)).length,1);assert.equal(eligible(legacy,'greeting',new Date(2026,9,20,8)).length,0);
  const {scheduleMatches}=require('../pet/voice-rules.js');for(let day=0;day<7;day++)for(let hour=0;hour<24;hour++)for(const dayType of policy.dayTypes)for(const period of policy.periods){const date=new Date(2026,9,19+day,hour);const h=period.hours,expected=(dayType.id==='all'||(dayType.id==='weekday'?day<5:day>=5))&&(!h||(h.start<h.end?hour>=h.start&&hour<h.end:hour>=h.start||hour<h.end));assert.equal(scheduleMatches({dayType:dayType.id,period:period.id},policy,date),expected);}
  store.update({volume:35,muted:true,idleMinutes:5});const reloaded=new VoiceStore(path.join(folder,'data'),policy,catalog);assert.equal(reloaded.settings.volume,35);assert.equal(reloaded.settings.muted,true);assert.equal(reloaded.snapshot().clips.click.length,1);
  store.remove(clip.id);assert.equal(store.snapshot().clips.click.length,0);assert.deepEqual(fs.readFileSync(source),bytes);
  let clock=0,created=0,last;const messages=[];const single={...snapshot,clips:{...snapshot.clips,click:[{id:'generic',lineId:'generic',name:'test',url:'test.wav'}]}};
  const player=new VoicePlayer(single,{now:()=>clock,status:s=>messages.push(s),createAudio:()=>{created++;return last={play:async()=>{},pause(){},removeAttribute(){},load(){}};}});
  assert.equal(await player.play('click'),true);assert.equal(last.playbackRate,1);assert.equal(await player.play('click'),false);last.onended();clock=1;assert.equal(await player.play('click'),true);assert.equal(await player.play('click',{preview:true}),false);last.onended();await new Promise(r=>setTimeout(r,5));assert.equal(created,2,'Ignored clicks must not queue');clock=2;assert.equal(await player.play('click'),true);
  const blocked=new VoicePlayer({...single,clips:{...single.clips,click:[{id:'video',lineId:'generic',name:'old.mp4',url:'old.mp4'}]}},{createAudio:()=>{throw Error('Video must never start playback');}});assert.equal(await blocked.play('click'),false);assert.equal(await blocked.play('click',{id:'video',preview:true}),false);blocked.destroy();
  player.update({...single,settings:{...single.settings,muted:true}});assert.equal(player.audio,null);assert.equal(await player.play('click',{preview:true}),false);
  player.update({...single,settings:{...single.settings,volume:25}});assert.equal(await player.play('click',{preview:true}),true);assert.equal(last.volume,.25);player.destroy();assert.equal(player.audio,null);assert.equal(created,4);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
 console.log('PASS voice: 3024 day-type/hour boundaries, legacy safety, arbitrary filenames, audio-only validation and video rejection, schedule edits, priority/fallback/no wrong-context speech, byte-exact import, persistence, removal, mute, volume, no cooldown, no queue, single channel and original audio speed');
})().catch(e=>{console.error(e);process.exitCode=1;});
