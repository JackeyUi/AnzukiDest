'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const {normalizeSchedule,acceptsFilename}=require('../pet/voice-rules.js');
class VoiceStore {
 constructor(data,policy,catalog){
  this.policy=policy;this.catalog=catalog;this.folder=path.join(data,'voice');this.file=path.join(data,'voice-index.json');
  fs.mkdirSync(this.folder,{recursive:true});let saved={};try{saved=JSON.parse(fs.readFileSync(this.file,'utf8'));}catch{}
  this.settings={...policy.defaults};this.update(saved.settings,false);
  this.clips={};for(const e of policy.events)this.clips[e.id]=(Array.isArray(saved.clips?.[e.id])?saved.clips[e.id]:[]).filter(c=>c&&/^[a-f0-9-]+\.[a-z0-9]+$/.test(c.file)&&typeof c.id==='string'&&typeof c.name==='string'&&fs.existsSync(path.join(this.folder,c.file))).slice(0,policy.maxClipsPerEvent);
  this.persist();this.cleanup();
 }
 cleanup(){const used=new Set(Object.values(this.clips).flat().map(c=>c.file));for(const f of fs.readdirSync(this.folder))if(!used.has(f)&&/^[a-f0-9-]+\.[a-z0-9]+$/.test(f))try{fs.unlinkSync(path.join(this.folder,f));}catch{}}
 update(p,write=true){
  if(p){if(Number.isFinite(p.volume))this.settings.volume=Math.max(0,Math.min(100,Math.round(p.volume)));
   for(const k of ['muted','idleEnabled'])if(typeof p[k]==='boolean')this.settings[k]=p[k];
   if(Number.isInteger(p.idleMinutes))this.settings.idleMinutes=Math.max(this.policy.idleMinutes.min,Math.min(this.policy.idleMinutes.max,p.idleMinutes));}
  if(write)this.persist();
 }
 persist(){const temp=this.file+'.tmp';fs.writeFileSync(temp,JSON.stringify({settings:this.settings,clips:this.clips||{}},null,2));fs.renameSync(temp,this.file);}
 snapshot(){return {policy:this.policy,catalog:this.catalog,settings:{...this.settings},clips:Object.fromEntries(Object.entries(this.clips).map(([k,v])=>[k,v.map(c=>({...c,unsupported:!acceptsFilename(c.name,this.policy),url:pathToFileURL(path.join(this.folder,c.file)).href}))]))};}
 setSchedule(id,value){const schedule=normalizeSchedule(value,this.policy);for(const clips of Object.values(this.clips)){const clip=clips.find(c=>c.id===id);if(clip){clip.schedule=schedule;clip.lineId='generic';this.persist();return;}}}
 async import(event,files,selection,validate=async()=>true){
  if(!Object.hasOwn(this.clips,event))throw new Error('Unknown voice category');const errors=[];
  for(const source of files){
   if(this.clips[event].length>=this.policy.maxClipsPerEvent){errors.push('每類最多 '+this.policy.maxClipsPerEvent+' 段');break;}
   try{const suffix=path.extname(source).slice(1).toLowerCase(),ext=/^[a-z0-9]{1,12}$/.test(suffix)?suffix:'bin',stat=await fs.promises.stat(source);
   if(!stat.isFile()||!stat.size||stat.size>this.policy.maxFileBytes){errors.push(path.basename(source)+'：檔案為空或超過 50 MB');continue;}
   if(!acceptsFilename(path.basename(source),this.policy)){errors.push(path.basename(source)+'：僅接受音檔，不接受影片或其他檔案');continue;}
   const schedule=normalizeSchedule(selection&&typeof selection==='object'?selection:{dayType:'all',period:'all'},this.policy);
   if(!await validate(source)){errors.push(path.basename(source)+'：只接受可解碼的純音訊檔，不接受影片');continue;}
   const id=crypto.randomUUID(),file=id+'.'+ext;
   await fs.promises.copyFile(source,path.join(this.folder,file));this.clips[event].push({id,file,lineId:'generic',schedule,name:path.basename(source)});
   }catch(e){errors.push(path.basename(source)+'：'+e.message);}
  }
  this.persist();return errors;
 }
 remove(id){for(const clips of Object.values(this.clips)){const n=clips.findIndex(c=>c.id===id);if(n>=0){const [clip]=clips.splice(n,1);this.persist();try{fs.unlinkSync(path.join(this.folder,clip.file));}catch{}return;}}}
}
module.exports={VoiceStore};
