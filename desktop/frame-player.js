/* Source-resolution RGBA playback. Frames and encoded assets are never resized or transcoded. */
(function(root){
 'use strict';
 function timeline(input){return (typeof module==='object'&&module.exports?require('../pet/animation-format.js'):root.AnzukiAnimationFormat).inspect(input);}
 function frameAt(starts,time){let low=0,high=starts.length;while(low<high){const mid=(low+high)>>>1;if(starts[mid]<=time)low=mid+1;else high=mid;}return Math.max(0,low-1);}
 class FramePlayer {
  constructor(container,config,loadClick,onFrame=()=>{}){
   this.element=container;this.config=config;this.loadClick=loadClick;this.idle=config.idle;this.busy=false;this.closed=false;this.serial=0;this.cache=new Map();this.idles=new Map();this.onFrame=onFrame;
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
     if(decoder.tracks.selectedTrack.frameCount!==clock.frames||clock.frames!==this.config.animations[name].frames)throw new Error('Decoded frame count changed');
     for(let i=0;i<clock.frames;i++){
      while(this.busy&&this.playingName!==name&&!this.closed)await new Promise(resolve=>setTimeout(resolve,16));
      const {image}=await decoder.decode({frameIndex:i,completeFramesOnly:true});
      if(image.displayWidth!==(this.config.animations[name].width||this.config.width)||image.displayHeight!==(this.config.animations[name].height||this.config.height)){image.close();throw new Error('Decoded image resolution changed');}
      if(this.closed){image.close();throw new Error('Player closed');}
      let bitmap;try{bitmap=await createImageBitmap(image,{colorSpaceConversion:'none',premultiplyAlpha:'premultiply'});}finally{image.close();}
      if(this.closed){bitmap.close();throw new Error('Player closed');}frames.push(bitmap);
      if(i%4===3)await new Promise(resolve=>setTimeout(resolve,0));
     }
     this.ready||(this.ready=new Set());this.ready.add(name);this.element.dataset.cachedClickAnimations=String(this.ready.size);return {...clock,frames};
    }catch(error){for(const frame of frames)frame.close();throw error;}finally{decoder.close();}
   })();this.cache.set(name,task);task.catch(()=>this.cache.delete(name));return task;
  }
  async warm(){for(const name of this.config.clicks){if(this.closed)return;try{await this.prepare(name);}catch(error){if(!this.closed)console.warn('Click frame preload failed',error);}}}
  cancelLoop(){
   cancelAnimationFrame(this.raf);this.finishFrameLoop?.(false);this.finishFrameLoop=null;
   this.closeLookahead?.();this.closeLookahead=null;
   if(this.idleDecoder){this.idleDecoder.close();this.idleDecoder=null;}
   this.streamBitmap?.close();this.streamBitmap=null;
  }
  beginFade(enabled){
   this.fade=null;if(!enabled||!this.painted)return;
   const saved=document.createElement('canvas');saved.width=this.canvas.width;saved.height=this.canvas.height;saved.getContext('2d').drawImage(this.canvas,0,0);
   this.fade={canvas:saved,started:null,duration:this.config.behavior?.crossfadeMs||250};
  }
  paint(source,name,speed,kind,now=performance.now()){
   const width=source.width||source.displayWidth,height=source.height||source.displayHeight;
   if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
   if(this.element.firstChild!==this.canvas)this.element.replaceChildren(this.canvas);
   const ctx=this.context;ctx.clearRect(0,0,width,height);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
   if(this.fade){
    if(this.fade.started===null)this.fade.started=now;
    const t=Math.min(1,Math.max(0,(now-this.fade.started)/this.fade.duration));
    ctx.globalAlpha=1-t;const old=this.fade.canvas,scale=Math.min(width/old.width,height/old.height),w=old.width*scale,h=old.height*scale;
    ctx.drawImage(old,(width-w)/2,(height-h)/2,w,h);
    // Add premultiplied colors/alpha: overlapping artwork stays opaque throughout a crossfade.
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=t;ctx.drawImage(source,0,0);
    if(t>=1)this.fade=null;
   }else ctx.drawImage(source,0,0);
   ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';this.painted=true;
   this.element.dataset.animation=name;this.element.dataset.speed=String(speed);this.element.dataset.renderer=kind;this.element.dataset.crossfading=String(!!this.fade);this.onFrame(this.canvas);
  }
  async encoded(name){
   if(!this.idles.has(name)){const p=this.loadClick(name).then(bytes=>({bytes,clock:timeline(bytes)}));this.idles.set(name,p);p.catch(()=>this.idles.delete(name));}
   // Bound encoded-file residency too; full-frame decoded caches are reserved for short click clips.
   const result=await this.idles.get(name);if(this.idles.size>3){for(const key of this.idles.keys()){if(key!==name){this.idles.delete(key);break;}}}return result;
  }
  async stream(name,{loop=false,speed=1,fade=true,idle=false}={}){
   if(this.closed)return false;this.beginFade(fade);const token=++this.serial;this.cancelLoop();this.busy=!idle;this.playingName=name;
   let decoder;
   try{
    const {bytes,clock}=await this.encoded(name);if(token!==this.serial||this.closed)return false;
    decoder=new ImageDecoder({data:new Uint8Array(bytes),type:'image/webp',preferAnimation:true,colorSpaceConversion:'none'});this.idleDecoder=decoder;await decoder.tracks.ready;await decoder.completed;
    const completion=new Promise(resolve=>{this.finishFrameLoop=resolve;});let started=null,previous=-1,ahead=null;const presented=new Set();
    const decodeBitmap=async index=>{const {image}=await decoder.decode({frameIndex:index,completeFramesOnly:true});let bitmap;try{bitmap=await createImageBitmap(image,{colorSpaceConversion:'none',premultiplyAlpha:'premultiply'});}finally{image.close();}if(token!==this.serial||this.closed){bitmap.close();return null;}return bitmap;};
    const discardAhead=()=>{const item=ahead;ahead=null;item?.promise.then(bitmap=>bitmap?.close()).catch(()=>{});};
    this.closeLookahead=discardAhead;
    const tick=async now=>{
     if(token!==this.serial||this.closed)return;
     const elapsed=started===null?0:(now-started)*speed;
     if(!loop&&elapsed>=clock.durationMs){this.element.__lastStream={name,expectedFrames:clock.frames,presentedFrames:presented.size,elapsedMs:elapsed/speed,expectedMs:clock.durationMs/speed};this.finishFrameLoop?.(true);this.finishFrameLoop=null;return;}
     const index=frameAt(clock.starts,loop?elapsed%clock.durationMs:elapsed);
     try{
      const changed=index!==previous;
      if(changed){
       let bitmap;if(ahead?.index===index){const item=ahead;ahead=null;bitmap=await item.promise;}else{discardAhead();bitmap=await decodeBitmap(index);}
       if(!bitmap)return;
       if(token!==this.serial||this.closed){bitmap.close();return;}
       this.streamBitmap?.close();this.streamBitmap=bitmap;previous=index;presented.add(index);this.element.dataset.frameIndex=String(index);
       const next=index+1<clock.frames?index+1:loop?0:null;
       if(next!==null)ahead={index:next,promise:decodeBitmap(next).catch(error=>{if(token===this.serial&&!this.closed)console.warn('Frame lookahead failed',error);return null;})};
      }
      if(this.streamBitmap&&(changed||this.fade)){this.paint(this.streamBitmap,name,speed,idle?'streamed-idle':'streamed-action',now);if(started===null)started=performance.now();}
      this.raf=requestAnimationFrame(tick);
     }catch(error){if(token===this.serial&&!this.closed){console.error('Animation frame failed',error);this.finishFrameLoop?.(false);this.finishFrameLoop=null;}}
    };
    await tick(performance.now());if(loop)return true;return await completion;
   }catch(error){if(token===this.serial&&!this.closed)console.error('Animation load failed',error);return false;}
   finally{if(!loop&&token===this.serial){this.closeLookahead?.();this.closeLookahead=null;if(this.idleDecoder===decoder){decoder?.close();this.idleDecoder=null;}this.streamBitmap?.close();this.streamBitmap=null;this.busy=false;}}
  }
  async setIdle(name,{force=false,fade=true}={}){
   this.idle=name;if(this.closed||this.busy&&!force)return;
   if(!force&&this.idleDecoder&&this.element.dataset.animation===name)return;
   return this.stream(name,{loop:true,idle:true,fade});
  }
  async click(name,speed){
   if(this.closed)return false;this.beginFade(false);const token=++this.serial;this.cancelLoop();this.busy=true;this.playingName=name;this.element.dataset.clickSerial=String(token);
   try{
    const track=await this.prepare(name);if(this.closed||token!==this.serial)return false;
    this.element.dataset.duration=String(track.durationMs/speed);
    const started=performance.now(),expectedMs=track.durationMs/speed;let previous=-1,lastPaint=null,largestGap=0,presented=0;
    const draw=(index,stamp)=>{if(index===previous)return;this.paint(track.frames[index],name,speed,'decoded-frames',stamp);previous=index;presented++;if(lastPaint!==null)largestGap=Math.max(largestGap,stamp-lastPaint);lastPaint=stamp;};
    draw(0,started);
    return await new Promise(resolve=>{
     this.finishFrameLoop=resolve;
     const tick=now=>{if(this.closed||token!==this.serial){resolve(false);return;}const elapsed=now-started;
      if(elapsed>=expectedMs){this.element.__lastPlayback={name,speed,expectedFrames:track.frames.length,presentedFrames:presented,elapsedMs:elapsed,expectedMs,maxPaintGapMs:largestGap,cacheReady:true};this.finishFrameLoop=null;resolve(true);return;}
      draw(frameAt(track.starts,elapsed*speed),now);this.raf=requestAnimationFrame(tick);
     };this.raf=requestAnimationFrame(tick);
    });
   }catch(error){if(!this.closed&&token===this.serial)console.error('Click decode failed',error);return false;}
   finally{if(token===this.serial&&!this.closed){this.busy=false;this.playingName=null;this.setIdle(this.idle);}}
  }
  destroy(){this.closed=true;this.serial++;this.busy=false;this.cancelLoop();this.fade=null;for(const task of this.cache.values())task.then(track=>{for(const f of track.frames)f.close();}).catch(()=>{});this.cache.clear();this.idles.clear();}
 }
 const api={timeline,frameAt,FramePlayer};if(typeof module==='object'&&module.exports)module.exports=api;else root.AnzukiFrames=api;
})(globalThis);
