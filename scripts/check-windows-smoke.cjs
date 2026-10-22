'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),folder=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'.local/windows-release/Anzuki-win32-x64'),executablePath=path.join(folder,'Anzuki.exe');
const {_electron}=require(path.join(root,'.local/windows-tools/node_modules/playwright'));
(async()=>{
 let app;
 try{
  app=await _electron.launch({executablePath,timeout:60000});
  const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>document.querySelector('#pet img')?.naturalWidth===720,null,{timeout:30000});
  const runtime=await app.evaluate(({app,BrowserWindow})=>({packaged:app.isPackaged,data:app.getPath('userData'),windows:BrowserWindow.getAllWindows().length}));assert.equal(runtime.packaged,true);assert(runtime.data.includes('Anzuki'));assert.equal(runtime.windows,1);
  await page.evaluate(()=>window.Anzuki.setPreferences({idle:'idle-loop-short',clickSpeed:2}));
  await page.waitForFunction(()=>document.querySelector('#pet').dataset.animation==='idle-loop-short');
  await page.waitForFunction(()=>document.querySelector('#pet').dataset.cachedClickAnimations==='2',null,{timeout:60000});
  await page.mouse.click(90,150);await page.waitForFunction(()=>document.querySelector('#pet').dataset.animation.startsWith('click'));
  assert.equal(await page.locator('#pet').getAttribute('data-speed'),'2');
  assert.equal(await page.locator('#pet').getAttribute('data-renderer'),'decoded-frames');
  assert.deepEqual(await page.locator('#pet canvas').evaluate(c=>[c.width,c.height]),[720,1280]);
  const playing=await page.locator('#pet').getAttribute('data-animation');for(let i=0;i<5;i++)await page.mouse.click(90,150);assert.equal(await page.locator('#pet').getAttribute('data-animation'),playing);
  await page.waitForFunction(()=>document.querySelector('#pet').dataset.animation==='idle-loop-short');
  const metrics=await page.locator('#pet').evaluate(e=>e.__lastPlayback);assert(metrics.cacheReady);assert(metrics.elapsedMs>=metrics.expectedMs);assert(metrics.elapsedMs<metrics.expectedMs+300);
  fs.writeFileSync(path.join(root,'.local/windows-release',process.argv[2]?'playback-metrics-patched.json':'playback-metrics.json'),JSON.stringify(metrics,null,2));console.log('PLAYBACK_METRICS '+JSON.stringify(metrics));
  await page.screenshot({path:path.join(root,'.local/windows-release/windows-smoke.png'),omitBackground:true});
  // Exercise the real settings window, file dialog IPC, decoder and local store.
  const testFolder=path.join(root,'.local/media-smoke');fs.mkdirSync(testFolder,{recursive:true});
  const wav=Buffer.alloc(44+16000);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
  const recording=path.join(testFolder,'自由命名錄音.wav'),extensionless=path.join(testFolder,'沒有副檔名'),video=path.join(testFolder,'隨意取名影片.webm'),silent=path.join(testFolder,'無音軌.webm'),invalid=path.join(testFolder,'文件.txt');
  fs.writeFileSync(recording,wav);fs.writeFileSync(extensionless,wav);fs.writeFileSync(video,Buffer.from(fs.readFileSync(path.join(root,'scripts/fixtures/with-audio.webm.b64'),'utf8'),'base64'));fs.writeFileSync(silent,Buffer.from(fs.readFileSync(path.join(root,'scripts/fixtures/silent.webm.b64'),'utf8'),'base64'));fs.writeFileSync(invalid,'not playable');
  await app.evaluate(({dialog},files)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:files});},[recording,extensionless,video,silent,invalid]);
  const imported=await page.evaluate(()=>window.Anzuki.importVoice('click',{dayType:'holiday',period:'night'}));assert.equal(imported.length,2);assert(imported.some(e=>e.includes('文件.txt')));assert(imported.some(e=>e.includes('無音軌.webm')));
  let voice=(await page.evaluate(()=>window.Anzuki.config())).voice;const added=voice.clips.click.filter(c=>['自由命名錄音.wav','沒有副檔名','隨意取名影片.webm'].includes(c.name));assert.equal(added.length,3);
  for(const clip of added){assert.deepEqual(clip.schedule,{dayType:'holiday',period:'night'});const expected=clip.name.endsWith('.webm')?fs.readFileSync(video):wav;assert.deepEqual(fs.readFileSync(path.join(runtime.data,'voice',clip.file)),expected);}
  const videoClip=added.find(c=>c.name.endsWith('.webm'));
  const playback=await page.evaluate(url=>new Promise(resolve=>{const audio=new Audio(url);audio.onplaying=()=>{resolve({rate:audio.playbackRate,bytes:audio.webkitAudioDecodedByteCount});audio.pause();};audio.onerror=()=>resolve(null);audio.play();}),videoClip.url);assert(playback);assert.equal(playback.rate,1);
  await page.evaluate(()=>window.Anzuki.stopVoice());
  await app.evaluate(({Menu})=>{const original=Menu.prototype.popup;Menu.prototype.popup=function(){Menu.prototype.popup=original;this.items[0].click();};});
  const settingsOpened=app.waitForEvent('window');await page.evaluate(()=>window.Anzuki.menu());const settings=await settingsOpened;settings.on('pageerror',e=>errors.push(e.message));await settings.waitForSelector('.voice-group');assert.equal(await settings.locator('.voice-group').count(),3);
  const day= settings.getByLabel(videoClip.name+' 播放日',{exact:true});assert.deepEqual(await day.locator('option').allTextContents(),['每天','平日','假日']);await day.selectOption('weekday');await settings.getByLabel(videoClip.name+' 時段',{exact:true}).selectOption('morning');
  await settings.locator('article').filter({hasText:videoClip.name}).getByRole('button',{name:'套用條件'}).click();
  await settings.waitForFunction(()=>document.querySelector('#voice-status').textContent==='已儲存播放條件');voice=(await page.evaluate(()=>window.Anzuki.config())).voice;assert.deepEqual(voice.clips.click.find(c=>c.id===videoClip.id).schedule,{dayType:'weekday',period:'morning'});
  await settings.screenshot({path:path.join(root,'.local/windows-release/media-settings.png'),fullPage:true});
  for(const clip of added)await page.evaluate(id=>window.Anzuki.removeVoice(id),clip.id);
  await settings.close();console.log('PASS actual Windows settings UI, unrestricted filename/extension import, original media bytes, WebM audio playback, invalid-file rejection and editable weekday/holiday periods');
  assert.deepEqual(errors,[]);await app.close();app=null;
  const saved=JSON.parse(fs.readFileSync(path.join(runtime.data,'position.json')));assert.equal(saved.idle,'idle-loop-short');assert.equal(saved.clickSpeed,2);
  console.log('PASS real Windows packaged EXE startup, original-resolution decode, native preload/IPC, short idle, 2x click, idle return and saved settings');
 }finally{if(app)await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
