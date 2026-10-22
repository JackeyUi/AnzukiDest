'use strict';
const {app,BrowserWindow,ipcMain,Menu,screen,dialog}=require('electron');
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const {VoiceStore}=require('./voice-store.cjs');
const ROOT=path.resolve(__dirname,'..');const DATA=path.join(ROOT,'data','desktop');
fs.mkdirSync(DATA,{recursive:true});app.setPath('userData',DATA);
const voice=new VoiceStore(DATA,JSON.parse(fs.readFileSync(path.join(ROOT,'pet','voice-config.json'),'utf8')),JSON.parse(fs.readFileSync(path.join(ROOT,'pet','voice-lines.json'),'utf8')));
const stateFile=path.join(DATA,'position.json');
let win,settingsWindow,index,drag=null,state={width:180,clickSpeed:1};
try{state={...state,...JSON.parse(fs.readFileSync(stateFile,'utf8'))};}catch{}
const save=()=>{if(win&&!win.isDestroyed()){const b=win.getBounds();fs.writeFileSync(stateFile,JSON.stringify({...b,width:state.width,idle:state.idle,clickSpeed:state.clickSpeed}));}};
function clamp(bounds){const area=screen.getDisplayMatching(bounds).workArea;return {...bounds,
 x:Math.max(area.x,Math.min(bounds.x,area.x+area.width-bounds.width)),
 y:Math.max(area.y,Math.min(bounds.y,area.y+area.height-bounds.height))};}
function resize(width){state.width=width;const b=win.getBounds();const height=Math.round(width*index.height/index.width);
 win.setBounds(clamp({x:Math.round(b.x+(b.width-width)/2),y:b.y+b.height-height,width,height}));save();}
function reset(){const a=screen.getPrimaryDisplay().workArea;const b=win.getBounds();win.setBounds(clamp({...b,x:a.x+a.width-b.width-20,y:a.y+a.height-b.height-20}));save();}
function preferences(){return {idle:state.idle,clickSpeed:state.clickSpeed};}
function updatePreferences(p){
 if(p&&index.idleOptions.includes(p.idle))state.idle=p.idle;
 if(p&&Number.isFinite(p.clickSpeed)&&p.clickSpeed>=1&&p.clickSpeed<=2&&Math.abs(p.clickSpeed*10-Math.round(p.clickSpeed*10))<1e-7)state.clickSpeed=p.clickSpeed;
 save();for(const w of [win,settingsWindow])if(w&&!w.isDestroyed())w.webContents.send('pet:settings',preferences());
}
function broadcastVoice(){for(const w of [win,settingsWindow])if(w&&!w.isDestroyed())w.webContents.send('pet:voice-changed',voice.snapshot());}
function showSettings(){
 if(settingsWindow&&!settingsWindow.isDestroyed()){settingsWindow.show();settingsWindow.focus();return;}
 settingsWindow=new BrowserWindow({width:480,height:Math.min(760,screen.getPrimaryDisplay().workArea.height-40),parent:win,resizable:true,title:'Anzuki 動畫與音聲設定',autoHideMenuBar:true,
  backgroundColor:'#10182a',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 settingsWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));settingsWindow.webContents.on('will-navigate',e=>e.preventDefault());
 settingsWindow.loadFile(path.join(__dirname,'settings.html'));settingsWindow.on('closed',()=>{settingsWindow=null;});
}
function menu(){Menu.buildFromTemplate([
 {label:'動畫／音聲設定…',click:showSettings},
 {label:'靜音',type:'checkbox',checked:voice.settings.muted,click:item=>{voice.update({muted:item.checked});broadcastVoice();}},
 {label:'待機動畫',submenu:index.idleOptions.map((name,i)=>({label:i===0?'長循環':'短循環',type:'radio',checked:state.idle===name,click:()=>updatePreferences({idle:name})}))},
 {label:'角色大小',submenu:[150,180,240,300,360].map(n=>({label:n+' px',type:'radio',checked:state.width===n,click:()=>resize(n)}))},
 {label:'保持最上層',type:'checkbox',checked:win.isAlwaysOnTop(),click:i=>win.setAlwaysOnTop(i.checked)},
 {label:'回到右下角',click:reset},{type:'separator'},{label:'結束 Anzuki',click:()=>app.quit()}
]).popup({window:win});}
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(()=>{
 try{index=JSON.parse(fs.readFileSync(path.join(ROOT,'pet','animations.json'),'utf8'));
 if(index.width!==720||index.height!==1280)throw new Error('Expected full-resolution 720x1280 artwork');
 for(const a of Object.values(index.animations))if(!fs.existsSync(path.join(ROOT,'pet','anzuki-animation',a.file)))throw new Error('Missing '+a.file);
 }catch(e){dialog.showErrorBox('Anzuki 素材讀取失敗','請完整解壓縮最新版檔案。\n'+e.message);app.quit();return;}
 state.idle=index.idleOptions.includes(state.idle)?state.idle:index.idle;
 state.clickSpeed=Number.isFinite(state.clickSpeed)&&state.clickSpeed>=1&&state.clickSpeed<=2?Math.round(state.clickSpeed*10)/10:index.clickSpeed.default;
 const width=[150,180,240,300,360].includes(state.width)?state.width:180;state.width=width;
 const area=screen.getPrimaryDisplay().workArea;const height=Math.round(width*index.height/index.width);
 const bounds=clamp({width,height,x:Number.isFinite(state.x)?state.x:area.x+area.width-width-20,
 y:Number.isFinite(state.y)?state.y:area.y+area.height-height-20});
 win=new BrowserWindow({...bounds,transparent:true,backgroundColor:'#00000000',frame:false,
  hasShadow:false,resizable:false,alwaysOnTop:true,skipTaskbar:true,focusable:false,
  title:'Anzuki',webPreferences:{autoplayPolicy:'no-user-gesture-required',preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',event=>event.preventDefault());
 const valid=ev=>win&&!win.isDestroyed()&&ev.sender===win.webContents;
 const trusted=ev=>valid(ev)||(settingsWindow&&!settingsWindow.isDestroyed()&&ev.sender===settingsWindow.webContents);
 ipcMain.handle('pet:config',ev=>{if(!trusted(ev))return null;return {...index,settings:preferences(),voice:voice.snapshot(),assetRoot:pathToFileURL(path.join(ROOT,'pet','anzuki-animation')).href+'/'};});
 ipcMain.handle('pet:voice-import',async(ev,event,lineId)=>{
  if(!trusted(ev)||!voice.policy.events.some(e=>e.id===event))throw new Error('Unknown voice category');
  const chosen=await dialog.showOpenDialog(settingsWindow||win,{title:'匯入角色音聲',properties:['openFile','multiSelections'],filters:[{name:'音訊',extensions:voice.policy.extensions}]});
  if(chosen.canceled)return [];const errors=await voice.import(event,chosen.filePaths,lineId);broadcastVoice();return errors;
 });
 ipcMain.on('pet:voice-preferences',(ev,p)=>{if(trusted(ev)){voice.update(p);broadcastVoice();}});
 ipcMain.on('pet:voice-remove',(ev,id)=>{if(trusted(ev)&&typeof id==='string'){voice.remove(id);broadcastVoice();}});
 ipcMain.on('pet:voice-play',(ev,p)=>{if(trusted(ev)&&p&&voice.policy.events.some(e=>e.id===p.event))win.webContents.send('pet:voice-play',{event:p.event,id:typeof p.id==='string'?p.id:undefined});});
 ipcMain.on('pet:voice-stop',ev=>{if(trusted(ev))win.webContents.send('pet:voice-stop');});
 ipcMain.on('pet:voice-status',(ev,message)=>{if(valid(ev)&&typeof message==='string'&&settingsWindow&&!settingsWindow.isDestroyed())settingsWindow.webContents.send('pet:voice-status',message.slice(0,200));});
 ipcMain.handle('pet:animation',async(ev,name)=>{if(!valid(ev)||!index.clicks.includes(name))throw new Error('Unknown click animation');return new Uint8Array(await fs.promises.readFile(path.join(ROOT,'pet','anzuki-animation',index.animations[name].file)));});
 ipcMain.on('pet:preferences',(ev,p)=>{if(trusted(ev))updatePreferences(p);});
 ipcMain.on('pet:drag-start',(ev,p)=>{if(valid(ev)&&p&&Number.isFinite(p.x)&&Number.isFinite(p.y))drag={...win.getBounds(),startX:p.x,startY:p.y};});
 ipcMain.on('pet:drag-move',(ev,p)=>{if(valid(ev)&&drag&&p&&Number.isFinite(p.x)&&Number.isFinite(p.y))win.setBounds(clamp({x:Math.round(drag.x+p.x-drag.startX),y:Math.round(drag.y+p.y-drag.startY),width:drag.width,height:drag.height}));});
 ipcMain.on('pet:drag-end',ev=>{if(valid(ev)){drag=null;save();}});
 ipcMain.on('pet:menu',ev=>{if(valid(ev))menu();});
 ipcMain.on('pet:quit',ev=>{if(valid(ev))app.quit();});
 win.loadFile(path.join(__dirname,'index.html'));win.on('closed',()=>{win=null;});
 screen.on('display-metrics-changed',()=>{if(win&&!win.isDestroyed())win.setBounds(clamp(win.getBounds()));});
 app.on('before-quit',save);
});
app.on('window-all-closed',()=>app.quit());
