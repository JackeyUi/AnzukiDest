'use strict';
(async()=>{
 const api=window.Anzuki,config=await api.config(),pet=document.querySelector('#pet');
 if(!config)return;
 let serial=0,timer=null,down=null,dragging=false;
 function play(name,once=false){
  clearTimeout(timer);const token=++serial;const image=new Image();image.alt='Anzuki';
  image.onload=()=>{if(token!==serial)return;pet.replaceChildren(image);pet.dataset.animation=name;
   if(once)timer=setTimeout(()=>play(config.idle),config.animations[name].durationMs);};
  image.src=config.assetRoot+encodeURIComponent(config.animations[name].file)+'?play='+token;
 }
 function click(){const pool=config.clicks;if(pool.length)play(pool[Math.floor(Math.random()*pool.length)],true);}
 pet.addEventListener('pointerdown',e=>{if(e.button!==0)return;down={x:e.screenX,y:e.screenY};dragging=false;pet.setPointerCapture(e.pointerId);api.dragStart(down);});
 pet.addEventListener('pointermove',e=>{if(!down)return;if(Math.hypot(e.screenX-down.x,e.screenY-down.y)>5)dragging=true;if(dragging)api.dragMove({x:e.screenX,y:e.screenY});});
 pet.addEventListener('pointerup',()=>{if(!down)return;api.dragEnd();down=null;if(!dragging)click();});
 pet.addEventListener('pointercancel',()=>{api.dragEnd();down=null;});
 pet.addEventListener('contextmenu',e=>{e.preventDefault();api.menu();});
 pet.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();click();}else if(e.key==='Escape')api.quit();});
 play(config.idle);
})();
