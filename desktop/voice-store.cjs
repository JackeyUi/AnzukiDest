'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
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
 snapshot(){return {policy:this.policy,catalog:this.catalog,settings:{...this.settings},clips:Object.fromEntries(Object.entries(this.clips).map(([k,v])=>[k,v.map(c=>({...c,url:pathToFileURL(path.join(this.folder,c.file)).href}))]))};}
 async import(event,files,lineId){
  if(!Object.hasOwn(this.clips,event))throw new Error('Unknown voice category');const errors=[];
  for(const source of files){
   if(this.clips[event].length>=this.policy.maxClipsPerEvent){errors.push('每類最多 '+this.policy.maxClipsPerEvent+' 段');break;}
   const ext=path.extname(source).slice(1).toLowerCase(),stat=await fs.promises.stat(source);
   if(!stat.isFile()||!stat.size||stat.size>this.policy.maxFileBytes||!this.policy.extensions.includes(ext)){errors.push(path.basename(source)+'：格式不支援或超過 50 MB');continue;}
   const chosen=lineId||path.basename(source,path.extname(source)).split('__')[0];
   if(chosen!=='generic'&&!this.catalog.lines.some(l=>l.id===chosen&&l.event===event)){errors.push(path.basename(source)+'：請依文本檔名命名，或先選擇對應台詞');continue;}
   const id=crypto.randomUUID(),file=id+'.'+ext;
   await fs.promises.copyFile(source,path.join(this.folder,file));this.clips[event].push({id,file,lineId:chosen,name:path.basename(source)});
  }
  this.persist();return errors;
 }
 remove(id){for(const clips of Object.values(this.clips)){const n=clips.findIndex(c=>c.id===id);if(n>=0){const [clip]=clips.splice(n,1);this.persist();try{fs.unlinkSync(path.join(this.folder,clip.file));}catch{}return;}}}
}
module.exports={VoiceStore};
