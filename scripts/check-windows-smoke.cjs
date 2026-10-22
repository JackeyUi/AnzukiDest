'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'.local/windows-release/Anzuki-win32-x64'),executablePath=path.join(folder,'Anzuki.exe');
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
  await page.mouse.click(90,150);await page.waitForFunction(()=>document.querySelector('#pet').dataset.animation.startsWith('click'));
  assert.equal(await page.locator('#pet').getAttribute('data-speed'),'2');
  await page.waitForFunction(()=>document.querySelector('#pet').dataset.animation==='idle-loop-short');
  await page.screenshot({path:path.join(root,'.local/windows-release/windows-smoke.png'),omitBackground:true});
  assert.deepEqual(errors,[]);await app.close();app=null;
  const saved=JSON.parse(fs.readFileSync(path.join(runtime.data,'position.json')));assert.equal(saved.idle,'idle-loop-short');assert.equal(saved.clickSpeed,2);
  console.log('PASS real Windows packaged EXE startup, original-resolution decode, native preload/IPC, short idle, 2x click, idle return and saved settings');
 }finally{if(app)await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
