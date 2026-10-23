'use strict';
const {app,BrowserWindow,ipcMain,Menu,screen,dialog,Tray}=require('electron');
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const ROOT=app.isPackaged?process.resourcesPath:path.resolve(__dirname,'..');
const DATA=app.isPackaged?path.join(app.getPath('appData'),'Anzuki','desktop'):path.join(ROOT,'data','desktop');
const startupLog=path.join(DATA,'startup.log');let fatalHandled=false;
function logStartup(message){try{fs.mkdirSync(DATA,{recursive:true});fs.appendFileSync(startupLog,new Date().toISOString()+' '+String(message).slice(0,6000)+'\n');}catch{}}
function fatalStartup(error){if(fatalHandled)return;fatalHandled=true;const message=String(error?.stack||error);logStartup(message);dialog.showErrorBox('Anzuki 啟動失敗',message+'\n\n啟動紀錄：'+startupLog);app.exit(1);}
process.on('uncaughtException',fatalStartup);process.on('unhandledRejection',fatalStartup);
fs.mkdirSync(DATA,{recursive:true});app.setPath('userData',DATA);
const {VoiceStore}=require('./voice-store.cjs');const {AnimationStore}=require('./animation-store.cjs');
logStartup('start '+app.getVersion()+' '+process.arch);
const voice=new VoiceStore(DATA,JSON.parse(fs.readFileSync(path.join(ROOT,'pet','voice-config.json'),'utf8')),JSON.parse(fs.readFileSync(path.join(ROOT,'pet','voice-lines.json'),'utf8')));
const library=new AnimationStore(DATA);let baseIndex;
const stateFile=path.join(DATA,'position.json');
let tray,win,settingsWindow,index,drag=null,firstFrame=false,rendererStopped=false,startupTimer,state={width:180,clickSpeed:1,napMinutes:10,actionMinutes:10,napEnabled:true,autoEnabled:true};
try{state={...state,...JSON.parse(fs.readFileSync(stateFile,'utf8'))};}catch{}
const save=()=>{if(win&&!win.isDestroyed()){const b=win.getBounds();fs.writeFileSync(stateFile,JSON.stringify({...b,width:state.width,...preferences()}));}};
function clamp(bounds){const area=screen.getDisplayMatching(bounds).workArea;return {...bounds,
 x:Math.max(area.x,Math.min(bounds.x,area.x+area.width-bounds.width)),
 y:Math.max(area.y,Math.min(bounds.y,area.y+area.height-bounds.height))};}
function resize(width){state.width=width;const b=win.getBounds();const height=Math.round(width*index.height/index.width);
 win.setBounds(clamp({x:Math.round(b.x+(b.width-width)/2),y:b.y+b.height-height,width,height}));save();}
function reset(){const a=screen.getPrimaryDisplay().workArea;const b=win.getBounds();win.setBounds(clamp({...b,x:a.x+a.width-b.width-20,y:a.y+a.height-b.height-20}));save();}
function recover(){if(!win||win.isDestroyed()||!index)return;logStartup('recover visible pet');if(win.isMinimized())win.restore();win.showInactive();win.setAlwaysOnTop(true);win.setOpacity(1);reset();updatePreferences({idle:index.idle});if(rendererStopped||!firstFrame){rendererStopped=false;firstFrame=false;win.webContents.reloadIgnoringCache();}const play=()=>win&&!win.isDestroyed()&&win.webContents.send('pet:play-animation','idle');if(win.webContents.isLoading())win.webContents.once('did-finish-load',play);else play();}
function minutes(value){return Number.isInteger(value)&&value>=5&&value<=30?value:10;}
function preferences(){return {idle:state.idle,clickSpeed:state.clickSpeed,clickAnimation:state.clickAnimation||'builtin',napMinutes:minutes(state.napMinutes),actionMinutes:minutes(state.actionMinutes),napEnabled:state.napEnabled!==false,autoEnabled:state.autoEnabled!==false};}
function rebuild(){index=library.merge(baseIndex,state.clickAnimation);if(!index.idleOptions.includes(state.idle))state.idle=index.idle;if(!index.clickOptions.some(c=>c.id===state.clickAnimation))state.clickAnimation='builtin';}
function snapshot(){return {...index,settings:preferences(),voice:voice.snapshot(),assetRoot:pathToFileURL(path.join(ROOT,'pet','anzuki-animation')).href+'/'};}
function broadcastLibrary(){rebuild();save();for(const w of [win,settingsWindow])if(w&&!w.isDestroyed())w.webContents.send('pet:library',snapshot());}
function updatePreferences(p){
 if(p&&index.idleOptions.includes(p.idle))state.idle=p.idle;
 if(p&&Number.isFinite(p.clickSpeed)&&p.clickSpeed>=1&&p.clickSpeed<=2&&Math.abs(p.clickSpeed*10-Math.round(p.clickSpeed*10))<1e-7)state.clickSpeed=p.clickSpeed;
 for(const key of ['napMinutes','actionMinutes'])if(p&&Number.isInteger(p[key])&&p[key]>=5&&p[key]<=30)state[key]=p[key];
 for(const key of ['napEnabled','autoEnabled'])if(p&&typeof p[key]==='boolean')state[key]=p[key];
 if(p&&index.clickOptions.some(c=>c.id===p.clickAnimation)&&p.clickAnimation!==state.clickAnimation){state.clickAnimation=p.clickAnimation;broadcastLibrary();return;}
 save();for(const w of [win,settingsWindow])if(w&&!w.isDestroyed())w.webContents.send('pet:settings',preferences());
}
function broadcastVoice(){for(const w of [win,settingsWindow])if(w&&!w.isDestroyed())w.webContents.send('pet:voice-changed',voice.snapshot());}
function showSettings(){
 if(settingsWindow&&!settingsWindow.isDestroyed()){settingsWindow.show();settingsWindow.focus();return;}
 settingsWindow=new BrowserWindow({width:640,height:Math.min(850,screen.getPrimaryDisplay().workArea.height-40),parent:win,resizable:true,title:'Anzuki 動畫與音聲設定',autoHideMenuBar:true,
  backgroundColor:'#10182a',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 settingsWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));settingsWindow.webContents.on('will-navigate',e=>e.preventDefault());
 settingsWindow.loadFile(path.join(__dirname,'settings.html'));settingsWindow.on('closed',()=>{settingsWindow=null;});
}
function menu(){Menu.buildFromTemplate([
 {label:'動畫／音聲設定…',click:showSettings},
 {label:'播放動畫',submenu:[...(index.behavior?.manual||[]).map(item=>({label:item.label,click:()=>win.webContents.send('pet:play-animation',item.id)})),{type:'separator'},{label:'回到呼吸動畫／喚醒',click:()=>win.webContents.send('pet:play-animation','idle')}]},
 {label:'靜音',type:'checkbox',checked:voice.settings.muted,click:item=>{voice.update({muted:item.checked});broadcastVoice();}},
 {label:'待機動畫',submenu:index.idleOptions.map((name,i)=>({label:index.animations[name].label||(i===0?'長循環':'短循環'),type:'radio',checked:state.idle===name,click:()=>updatePreferences({idle:name})}))},
 {label:'角色大小',submenu:[150,180,240,300,360].map(n=>({label:n+' px',type:'radio',checked:state.width===n,click:()=>resize(n)}))},
 {label:'保持最上層',type:'checkbox',checked:win.isAlwaysOnTop(),click:i=>win.setAlwaysOnTop(i.checked)},
 {label:'回到右下角',click:reset},{type:'separator'},{label:'結束 Anzuki',click:()=>app.quit()}
]).popup({window:win});}
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(async()=>{
 app.on('second-instance',recover);
 try{index=JSON.parse(fs.readFileSync(path.join(ROOT,'pet','animations.json'),'utf8'));
 if(index.width!==720||index.height!==1280)throw new Error('Expected full-resolution 720x1280 artwork');
 for(const a of Object.values(index.animations))if(!fs.existsSync(path.join(ROOT,'pet','anzuki-animation',a.file)))throw new Error('Missing '+a.file);
 }catch(e){dialog.showErrorBox('Anzuki 素材讀取失敗','請完整解壓縮最新版檔案。\n'+e.message);app.quit();return;}
 baseIndex=index;rebuild();state.idle=index.idleOptions.includes(state.idle)?state.idle:index.idle;
 state.clickSpeed=Number.isFinite(state.clickSpeed)&&state.clickSpeed>=1&&state.clickSpeed<=2?Math.round(state.clickSpeed*10)/10:index.clickSpeed.default;
 const width=[150,180,240,300,360].includes(state.width)?state.width:180;state.width=width;
 const area=screen.getPrimaryDisplay().workArea;const height=Math.round(width*index.height/index.width);
 const bounds=clamp({width,height,x:Number.isFinite(state.x)?state.x:area.x+area.width-width-20,
 y:Number.isFinite(state.y)?state.y:area.y+area.height-height-20});
 win=new BrowserWindow({...bounds,transparent:true,backgroundColor:'#00000000',frame:false,
  hasShadow:false,resizable:false,alwaysOnTop:true,skipTaskbar:true,focusable:false,
  title:'Anzuki',webPreferences:{backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required',preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.setIgnoreMouseEvents(true,{forward:true});win.__petHit=false;
 const cursorTimer=setInterval(()=>{if(win&&!win.isDestroyed()){const point=screen.getCursorScreenPoint(),bounds=win.getBounds();win.webContents.send('pet:cursor',{x:point.x-bounds.x,y:point.y-bounds.y,screenX:point.x,screenY:point.y});}},16);win.on('closed',()=>clearInterval(cursorTimer));
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',event=>event.preventDefault());
 const valid=ev=>win&&!win.isDestroyed()&&ev.sender===win.webContents;
 const trusted=ev=>valid(ev)||(settingsWindow&&!settingsWindow.isDestroyed()&&ev.sender===settingsWindow.webContents);
 ipcMain.on('pet:painted',ev=>{if(valid(ev)&&!firstFrame){firstFrame=true;clearTimeout(startupTimer);logStartup('first frame displayed');}});
 ipcMain.on('pet:startup-error',(ev,message)=>{if(valid(ev)&&typeof message==='string')logStartup('renderer: '+message);});
 ipcMain.on('pet:recover',ev=>{if(trusted(ev))recover();});
 ipcMain.handle('pet:config',ev=>{if(!trusted(ev))return null;return snapshot();});
 ipcMain.on('pet:play-animation',(ev,id)=>{if(trusted(ev)&&(id==='idle'||index.behavior?.manual.some(item=>item.id===id)))win.webContents.send('pet:play-animation',id);});
 ipcMain.on('pet:hit',(ev,inside)=>{if(valid(ev)&&typeof inside==='boolean'&&win.__petHit!==inside){win.__petHit=inside;win.setIgnoreMouseEvents(!inside,{forward:true});}});
 ipcMain.handle('pet:animation-import',async(ev,role)=>{
  if(!trusted(ev)||!['idle','click'].includes(role))throw Error('未知動畫用途');const chosen=await dialog.showOpenDialog(settingsWindow||win,{title:'加入透明動態 WebP',properties:['openFile'],filters:[{name:'透明動態 WebP',extensions:['webp']}]});if(chosen.canceled)return null;
  const item=await library.import(chosen.filePaths[0],role,async bytes=>win.webContents.executeJavaScript(`(async()=>{const decoder=new ImageDecoder({data:Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}),c=>c.charCodeAt(0)),type:'image/webp',preferAnimation:true,colorSpaceConversion:'none'});try{await decoder.tracks.ready;await decoder.completed;for(let i=0;i<decoder.tracks.selectedTrack.frameCount;i++){const {image}=await decoder.decode({frameIndex:i,completeFramesOnly:true});image.close();if(i%8===7)await new Promise(r=>setTimeout(r,0));}return true;}catch{return false;}finally{decoder.close();}})()`));
  if(role==='idle')state.idle=item.id;else state.clickAnimation=item.id;broadcastLibrary();return item;
 });
 ipcMain.handle('pet:animation-remove',(ev,id)=>{if(!trusted(ev))return;library.remove(id);broadcastLibrary();});
 ipcMain.handle('pet:voice-import' ,async(ev,event,lineId)=>{
  if(!trusted(ev)||!voice.policy.events.some(e=>e.id===event))throw new Error('Unknown voice category');
  const chosen=await dialog.showOpenDialog(settingsWindow||win,{title:'匯入角色音聲',properties:['openFile','multiSelections'],filters:[{name:'音檔',extensions:voice.policy.extensions}]});
  if(chosen.canceled)return [];const errors=await voice.import(event,chosen.filePaths,lineId,source=>win.webContents.executeJavaScript(`new Promise(resolve=>{
   const audio=document.createElement('video');let done=false;const finish=ok=>{if(done)return;done=true;clearTimeout(timer);audio.onloadeddata=null;audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load();resolve(ok);};
   const timer=setTimeout(()=>finish(false),12000);audio.onloadeddata=()=>{try{finish(audio.videoWidth===0&&audio.videoHeight===0&&(typeof audio.captureStream==='function'?audio.captureStream().getAudioTracks().length>0:audio.webkitAudioDecodedByteCount>0));}catch{finish(false);}};audio.onerror=()=>finish(false);audio.preload='auto';audio.src=${JSON.stringify(pathToFileURL(source).href)};audio.load();
  })`));broadcastVoice();return errors;
 });
 ipcMain.on('pet:voice-preferences',(ev,p)=>{if(trusted(ev)){voice.update(p);broadcastVoice();}});
 ipcMain.handle('pet:voice-schedule',(ev,id,value)=>{if(!trusted(ev))return;voice.setSchedule(id,value);broadcastVoice();});
 ipcMain.on('pet:voice-remove',(ev,id)=>{if(trusted(ev)&&typeof id==='string'){voice.remove(id);broadcastVoice();}});
 ipcMain.on('pet:voice-play',(ev,p)=>{if(trusted(ev)&&p&&voice.policy.events.some(e=>e.id===p.event))win.webContents.send('pet:voice-play',{event:p.event,id:typeof p.id==='string'?p.id:undefined});});
 ipcMain.on('pet:voice-stop',ev=>{if(trusted(ev))win.webContents.send('pet:voice-stop');});
 ipcMain.on('pet:voice-status',(ev,message)=>{if(valid(ev)&&typeof message==='string'&&settingsWindow&&!settingsWindow.isDestroyed())settingsWindow.webContents.send('pet:voice-status',message.slice(0,200));});
 ipcMain.handle('pet:animation',async(ev,name)=>{if(!valid(ev)||!Object.hasOwn(index.animations,name))throw new Error('Unknown animation');return new Uint8Array(await fs.promises.readFile(index.animations[name].custom?library.path(name):path.join(ROOT,'pet','anzuki-animation',index.animations[name].file)));});
 ipcMain.on('pet:preferences',(ev,p)=>{if(trusted(ev))updatePreferences(p);});
 ipcMain.on('pet:drag-start',(ev,p)=>{if(valid(ev)&&p&&Number.isFinite(p.x)&&Number.isFinite(p.y))drag={...win.getBounds(),startX:p.x,startY:p.y};});
 ipcMain.on('pet:drag-move',(ev,p)=>{if(valid(ev)&&drag&&p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){drag.moved=true;win.setBounds(clamp({x:Math.round(drag.x+p.x-drag.startX),y:Math.round(drag.y+p.y-drag.startY),width:drag.width,height:drag.height}));}});
 ipcMain.on('pet:drag-end',ev=>{if(valid(ev)){const moved=drag?.moved;drag=null;if(moved)save();}});
 ipcMain.on('pet:menu',ev=>{if(valid(ev))menu();});
 ipcMain.on('pet:quit',ev=>{if(valid(ev))app.quit();});
 win.webContents.on('did-fail-load',(_event,code,message,url)=>logStartup('page load failed: '+code+' '+message+' '+url));
 win.webContents.on('preload-error',(_event,file,error)=>logStartup('preload failed: '+file+' '+String(error?.stack||error)));
 win.loadFile(path.join(__dirname,'index.html'));win.on('closed',()=>{win=null;});
 startupTimer=setTimeout(()=>{if(!firstFrame&&win&&!win.isDestroyed()){logStartup('no frame after 20 seconds');showSettings();dialog.showErrorBox('Anzuki 尚未顯示','動畫尚未成功載入。請按設定中的「顯示桌寵／回到右下角」。\n\n若仍無法顯示，啟動紀錄位於：\n'+startupLog);}},20000);
 win.webContents.on('render-process-gone',(_event,details)=>{logStartup('renderer stopped: '+JSON.stringify(details));if(details.reason!=='clean-exit'&&win&&!win.isDestroyed()){rendererStopped=true;showSettings();}});
 try{tray=new Tray(await app.getFileIcon(process.execPath,{size:'small'}));tray.setToolTip('Anzuki');tray.setContextMenu(Menu.buildFromTemplate([{label:'動畫／音聲設定…',click:showSettings},{label:'顯示桌寵／回到右下角',click:recover},{label:'結束 Anzuki',click:()=>app.quit()}]));tray.on('double-click',showSettings);}catch(error){console.warn('Tray icon unavailable',error);}
 screen.on('display-metrics-changed',()=>{if(win&&!win.isDestroyed())win.setBounds(clamp(win.getBounds()));});
 app.on('before-quit',()=>{clearTimeout(startupTimer);save();});
});
app.on('window-all-closed',()=>app.quit());
