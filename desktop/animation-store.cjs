'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const {inspect}=require('../pet/animation-format.js');
class AnimationStore{
 constructor(data){this.folder=path.join(data,'animations');this.file=path.join(this.folder,'index.json');fs.mkdirSync(this.folder,{recursive:true});let rows=[];try{rows=JSON.parse(fs.readFileSync(this.file,'utf8'));}catch{}
  this.items=Array.isArray(rows)?rows.filter(c=>c&&/^custom-[a-f0-9-]+$/.test(c.id)&&c.file===c.id+'.webp'&&['idle','click'].includes(c.role)&&fs.existsSync(path.join(this.folder,c.file))):[];
 }
 persist(){fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.items,null,2));fs.renameSync(this.file+'.tmp',this.file);}
 path(id){const item=this.items.find(i=>i.id===id);if(!item)throw Error('找不到自訂動畫');return path.join(this.folder,item.file);}
 async import(source,role,validate=async()=>true){if(!['idle','click'].includes(role))throw Error('未知動畫用途');if(this.items.length>=10)throw Error('最多保留 10 段自訂動畫');
  const stat=await fs.promises.stat(source);if(stat.size>104857600)throw Error('單一動畫最多 100 MB');const bytes=await fs.promises.readFile(source);if(bytes.length>104857600)throw Error('單一動畫最多 100 MB');const info=inspect(bytes);if(!info.alpha)throw Error('請提供透明背景的動畫，無法自動移除實色背景');
  if(info.width>4096||info.height>4096||info.frames>1000||(role==='click'&&info.width*info.height*info.frames>100000000))throw Error('動畫超過播放記憶體上限，請縮短動畫；不需降低畫質');
  if(!await validate(bytes,info))throw Error('動畫無法完整解碼');const id='custom-'+crypto.randomUUID(),file=id+'.webp';await fs.promises.writeFile(path.join(this.folder,file),bytes);
  const item={id,file,role,label:path.basename(source),width:info.width,height:info.height,frames:info.frames,durationMs:info.durationMs,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};this.items.push(item);this.persist();return item;
 }
 remove(id){const index=this.items.findIndex(i=>i.id===id);if(index<0)return;const [item]=this.items.splice(index,1);this.persist();try{fs.unlinkSync(path.join(this.folder,item.file));}catch{}}
 merge(base,selected){const index=structuredClone(base);index.custom=this.items.map(i=>({...i}));index.clickOptions=[{id:'builtin',label:'內建隨機'},...this.items.filter(i=>i.role==='click').map(i=>({id:i.id,label:i.label}))];
  for(const i of this.items){index.animations[i.id]={...i,url:pathToFileURL(path.join(this.folder,i.file)).href,custom:true};if(i.role==='idle')index.idleOptions.push(i.id);}
  if(this.items.some(i=>i.id===selected&&i.role==='click'))index.clicks=[selected];return index;
 }
}
module.exports={AnimationStore};
