'use strict';
(async()=>{
 const api=window.Anzuki,config=await api.config(),pet=document.querySelector('#pet');
 if(!config)return;
 const voices=new AnzukiVoice.VoicePlayer(config.voice,{status:message=>api.reportVoice(message)});
 api.onVoiceChanged(p=>voices.update(p));api.onVoicePlay(p=>voices.play(p.event,{id:p.id,preview:true}));api.onVoiceStop(()=>voices.stop());
 window.addEventListener('beforeunload',()=>voices.destroy());
 let settings={idle:config.idle,clickSpeed:1,...config.settings};
 let down=null,dragging=false;
 const player=new AnzukiFrames.FramePlayer(pet,config,name=>api.animation(name));
 window.addEventListener('beforeunload',()=>player.destroy());
 api.onSettings(next=>{settings={...settings,...next};player.setIdle(settings.idle);});
 function click(){if(player.busy)return;voices.play('click');const ready=config.clicks.filter(name=>player.ready?.has(name)),pool=ready.length?ready:config.clicks;if(pool.length)player.click(pool[Math.floor(Math.random()*pool.length)],settings.clickSpeed);}
 pet.addEventListener('pointerdown',e=>{if(e.button!==0)return;down={x:e.screenX,y:e.screenY};dragging=false;pet.setPointerCapture(e.pointerId);api.dragStart(down);});
 pet.addEventListener('pointermove',e=>{if(!down)return;if(Math.hypot(e.screenX-down.x,e.screenY-down.y)>5)dragging=true;if(dragging)api.dragMove({x:e.screenX,y:e.screenY});});
 pet.addEventListener('pointerup',()=>{if(!down)return;api.dragEnd();down=null;if(!dragging)click();});
 pet.addEventListener('pointercancel',()=>{api.dragEnd();down=null;});
 pet.addEventListener('contextmenu',e=>{e.preventDefault();api.menu();});
 pet.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();click();}else if(e.key==='Escape')api.quit();});
 await player.setIdle(settings.idle);player.warm();voices.play('greeting');
})();
