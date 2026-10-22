'use strict';
(async()=>{
 const api=window.Anzuki,initial=await api.config(),pet=document.querySelector('#pet');if(!initial)return;
 const voices=new AnzukiVoice.VoicePlayer(initial.voice,{status:message=>api.reportVoice(message)});
 api.onVoiceChanged(p=>voices.update(p));api.onVoicePlay(p=>voices.play(p.event,{id:p.id,preview:true}));api.onVoiceStop(()=>voices.stop());
 const hit=new AnzukiHit.HitTest(pet);let config=initial,settings,player,down=null,dragging=false,cursor={x:-1,y:-1};
 function updateHit(){const inside=!!down||hit.contains(cursor.x,cursor.y);pet.dataset.pointerHit=String(inside);api.setHit(inside);}
 api.onCursor(p=>{cursor=p;updateHit();});window.addEventListener('mousemove',e=>{cursor={x:e.clientX,y:e.clientY};updateHit();});
 async function install(next){config=next;settings={idle:next.idle,clickSpeed:1,...next.settings};player?.destroy();hit.ready=false;updateHit();const active=new AnzukiFrames.FramePlayer(pet,next,name=>api.animation(name),source=>{hit.update(source);updateHit();});player=active;await active.setIdle(settings.idle);if(active===player)active.warm();}
 api.onLibrary(install);api.onSettings(next=>{settings={...settings,...next};player?.setIdle(settings.idle);});
 function click(){voices.play('click');const ready=config.clicks.filter(name=>player.ready?.has(name)),pool=ready.length?ready:config.clicks;if(pool.length)player.click(pool[Math.floor(Math.random()*pool.length)],settings.clickSpeed);}
 pet.addEventListener('pointerdown',e=>{if(e.button!==0||!hit.contains(e.clientX,e.clientY))return;down={x:e.screenX,y:e.screenY};dragging=false;pet.setPointerCapture(e.pointerId);api.dragStart(down);updateHit();});
 pet.addEventListener('pointermove',e=>{if(!down)return;if(Math.hypot(e.screenX-down.x,e.screenY-down.y)>5)dragging=true;if(dragging)api.dragMove({x:e.screenX,y:e.screenY});});
 pet.addEventListener('pointerup',()=>{if(!down)return;api.dragEnd();down=null;if(!dragging)click();updateHit();});
 pet.addEventListener('pointercancel',()=>{api.dragEnd();down=null;updateHit();});
 pet.addEventListener('contextmenu',e=>{e.preventDefault();if(hit.contains(e.clientX,e.clientY))api.menu();});
 pet.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();click();}else if(e.key==='Escape')api.quit();});
 window.addEventListener('resize',()=>{if(player?.canvas?.width&&pet.firstChild===player.canvas){hit.update(player.canvas);updateHit();}});
 window.addEventListener('beforeunload',()=>{voices.destroy();player?.destroy();});await install(initial);voices.play('greeting');
})();
