'use strict';
(async()=>{
 const api=window.Anzuki,config=await api.config(),pet=document.querySelector('#pet');
 if(!config)return;
 let settings={idle:config.idle,clickSpeed:1,...config.settings};
 let serial=0,timer=null,down=null,dragging=false,current=config.idle,activeURL=null;
 const sources=new Map();
 async function play(name,once=false){
  clearTimeout(timer);const token=++serial,speed=once?settings.clickSpeed:1,image=new Image();image.alt='Anzuki';let url=null;
  try{
   let src=config.assetRoot+encodeURIComponent(config.animations[name].file)+'?play='+token;
   let duration=config.animations[name].durationMs;
   if(once){
    if(!sources.has(name))sources.set(name,api.animation(name));
    const raw=await sources.get(name);if(token!==serial)return;
    const timed=AnzukiTiming.retime(raw,speed);duration=timed.durationMs;
    url=URL.createObjectURL(new Blob([timed.bytes],{type:'image/webp'}));src=url;
   }
   image.onload=()=>{
    if(token!==serial){if(url)URL.revokeObjectURL(url);return;}
    const previous=activeURL;activeURL=url;pet.replaceChildren(image);current=name;pet.dataset.animation=name;
    pet.dataset.speed=String(speed);pet.dataset.duration=String(duration);
    if(previous)URL.revokeObjectURL(previous);
    if(once)timer=setTimeout(()=>play(settings.idle),duration);
   };
   image.onerror=()=>{if(url)URL.revokeObjectURL(url);if(token===serial&&once)play(settings.idle);};
   image.src=src;
  }catch(error){console.error('Animation load failed',error);if(url)URL.revokeObjectURL(url);if(token===serial&&once){sources.delete(name);play(settings.idle);}}
 }
 api.onSettings(next=>{settings={...settings,...next};if(!config.clicks.includes(current))play(settings.idle);});
 function click(){const pool=config.clicks;if(pool.length)play(pool[Math.floor(Math.random()*pool.length)],true);}
 pet.addEventListener('pointerdown',e=>{if(e.button!==0)return;down={x:e.screenX,y:e.screenY};dragging=false;pet.setPointerCapture(e.pointerId);api.dragStart(down);});
 pet.addEventListener('pointermove',e=>{if(!down)return;if(Math.hypot(e.screenX-down.x,e.screenY-down.y)>5)dragging=true;if(dragging)api.dragMove({x:e.screenX,y:e.screenY});});
 pet.addEventListener('pointerup',()=>{if(!down)return;api.dragEnd();down=null;if(!dragging)click();});
 pet.addEventListener('pointercancel',()=>{api.dragEnd();down=null;});
 pet.addEventListener('contextmenu',e=>{e.preventDefault();api.menu();});
 pet.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();click();}else if(e.key==='Escape')api.quit();});
 play(settings.idle);
})();
