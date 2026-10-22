/* Full-resolution decoded-frame cache; playback speed changes the clock, never the pixels. */
(function(root){
 'use strict';
 function timeline(input){return (typeof module==='object'&&module.exports?require('../pet/animation-format.js'):root.AnzukiAnimationFormat).inspect(input);}
 function frameAt(starts,time){let low=0,high=starts.length;while(low<high){const mid=(low+high)>>>1;if(starts[mid]<=time)low=mid+1;else high=mid;}return Math.max(0,low-1);}
 class FramePlayer {
  constructor(container,config,loadClick,onFrame=()=>{}){
   this.element=container;this.config=config;this.loadClick=loadClick;this.idle=config.idle;this.busy=false;this.closed=false;this.serial=0;this.cache=new Map();this.idles=new Map();this.lastFrame=null;this.onFrame=onFrame;
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
      if(image.displayWidth!==(this.config.animations[name].width||this.config.width)||image.displayHeight!==(this.config.animations[name].height||this.config.height)){image.close();throw new Error('Decoded image resolution changed');}
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
  cancelLoop(){cancelAnimationFrame(this.raf);this.finishFrameLoop?.();this.finishFrameLoop=null;clearTimeout(this.fallbackTimer);this.finishFallback?.();if(this.idleDecoder){this.idleDecoder.close();this.idleDecoder=null;}}
  paint(source,name,speed,kind){const width=source.width||source.displayWidth,height=source.height||source.displayHeight;if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
   if(this.element.firstChild!==this.canvas)this.element.replaceChildren(this.canvas);this.context.clearRect(0,0,width,height);this.context.drawImage(source,0,0);this.element.dataset.animation=name;this.element.dataset.speed=String(speed);this.element.dataset.renderer=kind;this.onFrame(source);
  }
  async setIdle(name){
   this.idle=name;if(this.closed||this.busy)return;if(this.idleDecoder&&this.element.dataset.animation===name)return;
   const token=++this.serial;this.cancelLoop();let decoder;
   try{if(!this.idles.has(name)){const pending=this.loadClick(name).then(bytes=>({bytes,clock:timeline(bytes)}));this.idles.set(name,pending);pending.catch(()=>this.idles.delete(name));}const {bytes,clock}=await this.idles.get(name);if(token!==this.serial||this.closed)return;
    decoder=new ImageDecoder({data:new Uint8Array(bytes),type:'image/webp',preferAnimation:true,colorSpaceConversion:'none'});this.idleDecoder=decoder;await decoder.tracks.ready;await decoder.completed;
    let started=null,previous=-1;
    const tick=async now=>{if(token!==this.serial||this.closed)return;const index=frameAt(clock.starts,started===null?0:(now-started)%clock.durationMs);
     if(index!==previous){let frame,bitmap;try{({image:frame}=await decoder.decode({frameIndex:index,completeFramesOnly:true}));bitmap=await createImageBitmap(frame,{colorSpaceConversion:'none',premultiplyAlpha:'premultiply'});if(token!==this.serial||this.closed)return;this.paint(bitmap,name,1,'streamed-idle');if(started===null)started=performance.now();previous=index;}catch(error){if(token===this.serial&&!this.closed)console.error('Idle frame failed',error);return;}finally{bitmap?.close();frame?.close();}}
     if(token===this.serial&&!this.closed)this.raf=requestAnimationFrame(tick);
    };await tick(performance.now());
   }catch(error){if(token===this.serial&&!this.closed)console.error('Idle load failed',error);}
  }
  async click(name,speed){
   if(this.closed)return false;const token=++this.serial;this.cancelLoop();this.busy=true;this.playingName=name;this.element.dataset.clickSerial=String(token);
   try{
    const track=await this.prepare(name);if(this.closed||token!==this.serial)return false;
    this.element.replaceChildren(this.canvas);this.element.dataset.animation=name;this.element.dataset.speed=String(speed);this.element.dataset.duration=String(track.durationMs/speed);this.element.dataset.renderer='decoded-frames';
    const started=performance.now(),expectedMs=track.durationMs/speed;let previous=-1,lastPaint=null,largestGap=0,presented=0;
    const draw=(index,stamp)=>{if(index===previous)return;this.paint(track.frames[index],name,speed,'decoded-frames');previous=index;presented++;if(lastPaint!==null)largestGap=Math.max(largestGap,stamp-lastPaint);lastPaint=stamp;};
    draw(0,started);
    await new Promise(resolve=>{
     this.finishFrameLoop=resolve;
     const tick=now=>{if(this.closed||token!==this.serial){resolve();return;}const elapsed=now-started;
      if(elapsed>=expectedMs){this.element.__lastPlayback={name,speed,expectedFrames:track.frames.length,presentedFrames:presented,elapsedMs:elapsed,expectedMs,maxPaintGapMs:largestGap,cacheReady:true};resolve();return;}
      draw(frameAt(track.starts,elapsed*speed),now);this.raf=requestAnimationFrame(tick);
     };this.raf=requestAnimationFrame(tick);
    });
    return true;
   }catch(error){if(!this.closed&&token===this.serial)console.error('Click decode failed',error);return false;}
   finally{if(token===this.serial&&!this.closed){this.busy=false;this.playingName=null;this.setIdle(this.idle);}}
  }
  destroy(){this.closed=true;this.serial++;this.busy=false;this.cancelLoop();for(const task of this.cache.values())task.then(track=>{for(const f of track.frames)f.close();}).catch(()=>{});this.cache.clear();this.idles.clear();}
 }
 const api={timeline,frameAt,FramePlayer};if(typeof module==='object'&&module.exports)module.exports=api;else root.AnzukiFrames=api;
})(globalThis);
