'use strict';
// Focused regression: a grab stays warm after idle/cache churn, and release/re-grab cancels safely.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function checkGrab(page,{baseline=false}={}){
 await page.waitForFunction(()=>document.querySelector('#pet canvas')?.width===720,null,{timeout:30000});
 if(!baseline)await page.waitForFunction(()=>document.querySelector('#pet').dataset.dragReady==='true',null,{timeout:60000});
 await page.evaluate(async()=>{
  const controller=window.__AnzukiBehavior,p=controller.player;
  // Reproduce the LRU eviction caused by several automatic/nap clips, without waiting minutes.
  for(const name of ['read-book','nap-start','nap-loop'])await p.encoded(name);
  controller.update({napEnabled:false,autoEnabled:false});
  const paint=p.paint.bind(p),stream=p.stream.bind(p);window.__grabSamples=[];
  p.stream=function(name,options){if(name===this.config.behavior.drag)window.__grabSamples.push({requested:performance.now(),frames:[]});return stream(name,options);};
  p.paint=function(source,name,...args){if(name===this.config.behavior.drag){const sample=window.__grabSamples.at(-1),index=Number(this.element.dataset.frameIndex);if(sample&&sample.frames.length<8&&sample.frames.at(-1)?.index!==index)sample.frames.push({index,ms:performance.now()-sample.requested});}return paint(source,name,...args);};
 });
 await page.waitForTimeout(1500);
 await page.mouse.move(90,160);await page.mouse.down();await page.mouse.move(112,174);
 await page.waitForFunction(()=>window.__grabSamples[0]?.frames.some(f=>f.index>=5),null,{polling:10,timeout:10000});
 const first=await page.evaluate(()=>window.__grabSamples[0]);
 await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('#pet').dataset.animation==='land',null,{timeout:10000});
 assert.equal(await page.locator('#pet').getAttribute('data-speed'),'2');
 // Release then immediately grab again, including cancellation of an in-flight lookahead.
 await page.evaluate(()=>{const c=window.__AnzukiBehavior;c.dragStart();c.dragEnd();c.dragStart();});
 await page.waitForFunction(()=>window.__grabSamples.at(-1)?.frames.some(f=>f.index>=5),null,{polling:10,timeout:10000});
 const repeated=await page.evaluate(()=>window.__grabSamples.at(-1));
 await page.evaluate(()=>window.__AnzukiBehavior.dragEnd());
 await page.waitForFunction(()=>document.querySelector('#pet').dataset.renderer==='streamed-idle',null,{timeout:15000});
 const p=await page.evaluate(()=>({size:[document.querySelector('#pet canvas').width,document.querySelector('#pet canvas').height],warm:!!window.__AnzukiBehavior.player.dragTrack}));assert.deepEqual(p.size,[720,1280]);
 const metrics={firstPaintMs:first.frames[0].ms,frame5Ms:first.frames.find(f=>f.index>=5).ms,regrabFirstPaintMs:repeated.frames[0].ms,regrabFrame5Ms:repeated.frames.find(f=>f.index>=5).ms,warmAfterRelease:p.warm};
 if(!baseline){assert(metrics.firstPaintMs<150,JSON.stringify(metrics));assert(metrics.frame5Ms<400,JSON.stringify(metrics));assert(metrics.regrabFirstPaintMs<150,JSON.stringify(metrics));assert(metrics.regrabFrame5Ms<400,JSON.stringify(metrics));assert(p.warm);}
 return metrics;
}
module.exports={checkGrab};
if(require.main===module)(async()=>{
 const root=path.resolve(__dirname,'..'),folder=path.resolve(process.argv[2]||path.join(root,'.local/windows-patched'));
 const {_electron}=require(path.join(root,'.local/windows-tools/node_modules/playwright'));let app;
 try{
  // The user's working launcher uses --disable-gpu; verify the same installed EXE mode.
  app=await _electron.launch({executablePath:path.join(folder,'Anzuki.exe'),args:['--disable-gpu'],timeout:60000});
  const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.waitForFunction(()=>window.__AnzukiBehavior);
  await page.evaluate(()=>window.Anzuki.setPreferences({idle:'idle-loop-long',napEnabled:false,autoEnabled:false}));
  await page.waitForFunction(()=>document.querySelector('#pet').dataset.animation==='idle-loop-long');
  const metrics=await checkGrab(page);assert.deepEqual(errors,[]);
  fs.mkdirSync(path.join(root,'.local/windows-release'),{recursive:true});fs.writeFileSync(path.join(root,'.local/windows-release/playback-metrics-grab.json'),JSON.stringify(metrics,null,2)+'\n');
  console.log('GRAB_START_METRICS '+JSON.stringify(metrics));console.log('PASS packaged update: warm first grab after cache churn, continuing 2x frames, quick release/re-grab and return to idle at original resolution');
 }finally{if(app)await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
