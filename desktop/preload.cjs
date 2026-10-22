'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('Anzuki',{
 config:()=>ipcRenderer.invoke('pet:config'),
 dragStart:p=>ipcRenderer.send('pet:drag-start',p),
 dragMove:p=>ipcRenderer.send('pet:drag-move',p),
 dragEnd:()=>ipcRenderer.send('pet:drag-end'),
 menu:()=>ipcRenderer.send('pet:menu'),quit:()=>ipcRenderer.send('pet:quit')
});
