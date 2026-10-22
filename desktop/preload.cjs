'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('Anzuki',{
 config:()=>ipcRenderer.invoke('pet:config'),
 animation:name=>ipcRenderer.invoke('pet:animation',name),
 setPreferences:p=>ipcRenderer.send('pet:preferences',p),
 onSettings:fn=>{const listener=(_event,p)=>fn(p);ipcRenderer.on('pet:settings',listener);return ()=>ipcRenderer.removeListener('pet:settings',listener);},
 dragStart:p=>ipcRenderer.send('pet:drag-start',p),
 dragMove:p=>ipcRenderer.send('pet:drag-move',p),
 dragEnd:()=>ipcRenderer.send('pet:drag-end'),
 menu:()=>ipcRenderer.send('pet:menu'),quit:()=>ipcRenderer.send('pet:quit')
});
