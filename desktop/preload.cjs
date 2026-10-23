'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('Anzuki',{
 setHit:inside=>ipcRenderer.send('pet:hit',inside),
 onCursor:fn=>ipcRenderer.on('pet:cursor',(_e,p)=>fn(p)),
 onAnimation:fn=>ipcRenderer.on('pet:play-animation',(_e,id)=>fn(id)),
 playAnimation:id=>ipcRenderer.send('pet:play-animation',id),
 importAnimation:role=>ipcRenderer.invoke('pet:animation-import',role),
 removeAnimation:id=>ipcRenderer.invoke('pet:animation-remove',id),
 onLibrary:fn=>ipcRenderer.on('pet:library',(_e,p)=>fn(p)),
 config:()=>ipcRenderer.invoke('pet:config'),
 importVoice:(event,lineId)=>ipcRenderer.invoke('pet:voice-import',event,lineId),
 setVoicePreferences:p=>ipcRenderer.send('pet:voice-preferences',p),
 setVoiceSchedule:(id,value)=>ipcRenderer.invoke('pet:voice-schedule',id,value),
 removeVoice:id=>ipcRenderer.send('pet:voice-remove',id),
 playVoice:p=>ipcRenderer.send('pet:voice-play',p),stopVoice:()=>ipcRenderer.send('pet:voice-stop'),
 reportVoice:message=>ipcRenderer.send('pet:voice-status',message),
 onVoiceChanged:fn=>{const f=(_e,p)=>fn(p);ipcRenderer.on('pet:voice-changed',f);return ()=>ipcRenderer.removeListener('pet:voice-changed',f);},
 onVoicePlay:fn=>ipcRenderer.on('pet:voice-play',(_e,p)=>fn(p)),
 onVoiceStop:fn=>ipcRenderer.on('pet:voice-stop',()=>fn()),
 onVoiceStatus:fn=>ipcRenderer.on('pet:voice-status',(_e,p)=>fn(p)),
 animation:name=>ipcRenderer.invoke('pet:animation',name),
 setPreferences:p=>ipcRenderer.send('pet:preferences',p),
 onSettings:fn=>{const listener=(_event,p)=>fn(p);ipcRenderer.on('pet:settings',listener);return ()=>ipcRenderer.removeListener('pet:settings',listener);},
 dragStart:p=>ipcRenderer.send('pet:drag-start',p),
 dragMove:p=>ipcRenderer.send('pet:drag-move',p),
 dragEnd:()=>ipcRenderer.send('pet:drag-end'),
 menu:()=>ipcRenderer.send('pet:menu'),quit:()=>ipcRenderer.send('pet:quit')
});
