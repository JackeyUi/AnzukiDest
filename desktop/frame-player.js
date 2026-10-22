/* Full-resolution decoded-frame cache; playback speed changes the clock, never the pixels. */
(function(root){
 'use strict';
 function timeline(input){
  const bytes=new Uint8Array(input),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const tag=(p,s)=>p+s.length<=bytes.length&&[...s].every((c,i)=>bytes[p+i]===c.charCodeAt(0));
  if(!tag(0,'RIFF')||!tag(8,'WEBP')||view.getUint32(4,true)+8!==bytes.length)throw new Error('Invalid animated WebP');
  const starts=[],durations=[];let offset=12,total=0;
  while(offset+8<=bytes.length){const size=view.getUint32(offset+4,true),end=offset+8+size;if(end>bytes.length)throw new Error('Truncated frame');
   if(tag(offset,'ANMF')){if(size<16)throw new Error('Invalid frame header');const p=offset+20,ms=bytes[p]|bytes[p+1]<<8|bytes[p+2]<<16;if(ms<1)throw new Error('Zero frame duration');starts.push(total);durations.push(ms);total+=ms;}
   offset=end+(size&1);
  }
  if(offset!==bytes.length||!starts.length)throw new Error('Missing animation frames');return {starts,durations,durationMs:total};
 }
 function frameAt(starts,time){let low=0,high=starts.length;while(low<high){const mid=(low+high)>>>1;if(starts[mid]<=time)low=mid+1;else high=mid;}return Math.max(0,low-1);}
 class FramePlayer {
  constructor(container,config,loadClick){
   this.element=container;this.config=config;this.loadClick=loadClick;this.idle=config.idle;this.busy=false;this.closed=false;this.serial=0;this.cache=new Map();this.idles=new Map();this.lastFrame=null;
   this.canvas=document.createElement('canvas');this.canvas.width=config.width;this.canvas.height=config.height;this.canvas.setAttribute('aria-label','Anzuki');
   this.context=this.canvas.getContext('2d',{alpha:true,desynchronized:true});
  }
  async prepare(name){
   if(this.cache.has(name))return this.cache.get(name);
   const task=(async()=>{
    if(typeof ImageDecoder==='undefined')throw new Error('ImageDecoder unavailable');
    const bytes=await this.loadClick(name),clock=timeline(bytes),frames=[];
    const decoder=new ImageDecoder({data:new Uint8Array(bytes),type:'image/webp',preferAnimation:true,colorSpaceConversion:'none'});
    try{
     await decoder.tracks.ready;await decoder.completed;
     if(decoder.tracks.selectedTrack.frameCount!==clock.starts.length||clock.starts.length!==this.config.animations[name].frames)throw new Error('Decoded frame count changed');
     for(let i=0;i<clock.starts.length;i++){
      while(this.busy&&this.playingName!==name&&!this.closed)await new Promise(resolve=>setTimeout(resolve,16));
      const {image}=await decoder.decode({frameIndex:i,completeFramesOnly:true});
      if(image.displayWidth!==this.config.width||image.displayHeight!==this.config.height){image.close();throw new Error('Decoded image resolution changed');}
      if(this.closed){image.close();throw new Error('Player closed');}
      let bitmap;try{bitmap=await createImageBitmap(image,{colorSpaceConversion:'none',premultiplyAlpha:'premultiply'});}finally{image.close();}
      if(this.closed){bitmap.close();throw new Error('Player closed');}frames.push(bitmap);
      if(i%4===3)await new Promise(resolve=>setTimeout(resolve,0));
     }
     const prepared={...clock,frames};this.ready||(this.ready=new Set());this.ready.add(name);this.element.dataset.cachedClickAnimations=String(this.ready.size);return prepared;
    }catch(error){for(const frame of frames)frame.close();throw error;}finally{decoder.close();}
   })();this.cache.set(name,task);task.catch(()=>{this.cache.delete(name);});return task;
  }
  async warm(){for(const name of this.config.clicks){if(this.closed)return;try{await this.prepare(name);}catch(error){if(!this.closed)console.warn('Click frame preload failed',error);}}}
  async setIdle(name){
   this.idle=name;if(this.closed)return;
   const token=this.busy?this.serial:++this.serial;let entry=this.idles.get(name);
   if(!entry){const image=new Image();image.alt='Anzuki';const loaded=new Promise((resolve,reject)=>{image.onload=()=>resolve(image);image.onerror=reject;});image.src=this.config.assetRoot+encodeURIComponent(this.config.animations[name].file);entry={image,loaded};this.idles.set(name,entry);}
   try{const image=await entry.loaded;if(token!==this.serial||this.closed||this.busy)return;this.element.replaceChildren(image);this.element.dataset.animation=name;this.element.dataset.speed='1';this.element.dataset.renderer='native-idle';}catch(error){console.error('Idle load failed',error);}
  }
  async click(name,speed){
   if(this.busy||this.closed)return false;this.busy=true;this.playingName=name;const token=++this.serial;
   try{
    const track=await this.prepare(name);if(this.closed||token!==this.serial)return false;
    this.element.replaceChildren(this.canvas);this.element.dataset.animation=name;this.element.dataset.speed=String(speed);this.element.dataset.duration=String(track.durationMs/speed);this.element.dataset.renderer='decoded-frames';
    const started=performance.now(),expectedMs=track.durationMs/speed;let previous=-1,lastPaint=null,largestGap=0,presented=0;
    const draw=(index,stamp)=>{if(index===previous)return;this.context.clearRect(0,0,this.canvas.width,this.canvas.height);this.context.drawImage(track.frames[index],0,0);previous=index;presented++;if(lastPaint!==null)largestGap=Math.max(largestGap,stamp-lastPaint);lastPaint=stamp;};
    draw(0,started);
    await new Promise(resolve=>{
     this.finishFrameLoop=resolve;
     const tick=now=>{if(this.closed||token!==this.serial){resolve();return;}const elapsed=now-started;
      if(elapsed>=expectedMs){this.element.__lastPlayback={name,speed,expectedFrames:track.frames.length,presentedFrames:presented,elapsedMs:elapsed,expectedMs,maxPaintGapMs:largestGap,cacheReady:true};resolve();return;}
      draw(frameAt(track.starts,elapsed*speed),now);this.raf=requestAnimationFrame(tick);
     };this.raf=requestAnimationFrame(tick);
    });
    return true;
   }catch(error){if(!this.closed){console.warn('Decoded click failed; using native image fallback',error);try{await this.fallback(name,speed,token);}catch(fallbackError){console.error('Native click fallback failed',fallbackError);}}return false;}
   finally{if(token===this.serial&&!this.closed){this.busy=false;this.playingName=null;this.setIdle(this.idle);}}
  }
  async fallback(name,speed,token){
   const raw=await this.loadClick(name),timed=root.AnzukiTiming.retime(raw,speed),url=URL.createObjectURL(new Blob([timed.bytes],{type:'image/webp'}));
   try{const image=new Image();image.alt='Anzuki';await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});if(token!==this.serial||this.closed)return;
    this.element.replaceChildren(image);this.element.dataset.animation=name;this.element.dataset.speed=String(speed);this.element.dataset.renderer='native-fallback';await new Promise(resolve=>{this.finishFallback=resolve;this.fallbackTimer=setTimeout(resolve,timed.durationMs);});
   }finally{URL.revokeObjectURL(url);}
  }
  destroy(){this.closed=true;this.serial++;this.busy=false;cancelAnimationFrame(this.raf);clearTimeout(this.fallbackTimer);this.finishFrameLoop?.();this.finishFallback?.();for(const task of this.cache.values())task.then(track=>{for(const f of track.frames)f.close();}).catch(()=>{});this.cache.clear();this.idles.clear();}
 }
 const api={timeline,frameAt,FramePlayer};if(typeof module==='object'&&module.exports)module.exports=api;else root.AnzukiFrames=api;
})(globalThis);
