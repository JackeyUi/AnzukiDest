'use strict';
(async()=>{
 const api=window.Anzuki,initial=await api.config(),pet=document.querySelector('#pet');if(!initial)return;
 const voices=new AnzukiVoice.VoicePlayer(initial.voice,{status:message=>api.reportVoice(message)});
 api.onVoiceChanged(p=>voices.update(p));api.onVoicePlay(p=>voices.play(p.event,{id:p.id,preview:true}));api.onVoiceStop(()=>voices.stop());
 const hit=new AnzukiHit.HitTest(pet);let config=initial,settings,player,behavior,down=null,dragging=false,cursor={x:-1,y:-1},lastGlobal=null,shown=initial.visible!==false;
 function updateHit(){const inside=!!down||hit.contains(cursor.x,cursor.y);pet.dataset.pointerHit=String(inside);api.setHit(inside);}
 api.onCursor(p=>{cursor=p;if(lastGlobal&&(p.screenX!==lastGlobal.x||p.screenY!==lastGlobal.y))behavior?.activity();lastGlobal={x:p.screenX,y:p.screenY};updateHit();});
 window.addEventListener('mousemove',e=>{cursor={x:e.clientX,y:e.clientY};behavior?.activity();updateHit();});
 async function install(next){
  config=next;settings={idle:next.idle,clickSpeed:1,napMinutes:10,actionMinutes:10,napEnabled:true,autoEnabled:true,...next.settings};
  behavior?.destroy();player?.destroy();hit.ready=false;updateHit();
  let painted=false,voiceSerial=-1;const active=new AnzukiFrames.FramePlayer(pet,next,name=>api.animation(name),source=>{hit.update(source);updateHit();if(voiceSerial!==active.serial){voiceSerial=active.serial;voices.playAnimation(pet.dataset.animation,behavior?.state==='click'&&pet.dataset.renderer==='decoded-frames'?'click':undefined);}if(!painted){painted=true;api.reportPainted();active.warm();}});player=active;
  behavior=new AnzukiBehavior.BehaviorController(active,next,settings,{onState:state=>pet.dataset.behavior=state});window.__AnzukiBehavior=behavior;pet.dataset.behavior='idle';
  if(!shown){behavior.suspend();return;}
  const loading=active.setIdle(settings.idle,{fade:false}),attempt=active.serial;const ok=await loading;
  if(ok===false&&active===player&&active.serial===attempt){api.reportStartupError('Cannot load idle '+settings.idle);if(settings.idle!==next.idle){settings.idle=next.idle;behavior.update(settings);api.setPreferences({idle:next.idle});await active.setIdle(next.idle,{force:true,fade:false});}}
 }
 api.onLibrary(install);api.onSettings(next=>{settings={...settings,...next};behavior?.update(settings);if(shown)player?.setIdle(settings.idle);});
 api.onVisibility(visible=>{shown=visible;hit.ready=false;if(visible)behavior?.manual('idle');else{down=null;dragging=false;api.setHit(false);behavior?.suspend();}});
 api.onAnimation(id=>behavior?.manual(id));
 function click(){behavior?.click();}
 pet.addEventListener('pointerdown',e=>{if(e.button!==0||!hit.contains(e.clientX,e.clientY))return;down={x:e.screenX,y:e.screenY};dragging=false;behavior?.interact();pet.setPointerCapture(e.pointerId);api.dragStart(down);updateHit();});
 pet.addEventListener('pointermove',e=>{if(!down)return;if(!dragging&&Math.hypot(e.screenX-down.x,e.screenY-down.y)>5){dragging=true;behavior?.dragStart();}if(dragging)api.dragMove({x:e.screenX,y:e.screenY});});
 pet.addEventListener('pointerup',e=>{if(!down)return;api.dragEnd({x:e.screenX,y:e.screenY});down=null;if(dragging)behavior?.dragEnd();else click();dragging=false;updateHit();});
 pet.addEventListener('pointercancel',()=>{api.dragEnd({cancelled:true});down=null;if(dragging)behavior?.dragEnd();dragging=false;updateHit();});
 pet.addEventListener('contextmenu',e=>{e.preventDefault();if(hit.contains(e.clientX,e.clientY)){behavior?.interact();api.menu();}});
 pet.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();click();}else if(e.key==='Escape')api.quit();});
 const timer=setInterval(()=>behavior?.tick(),1000);
 window.addEventListener('resize',()=>{if(player?.canvas?.width&&pet.firstChild===player.canvas){hit.update(player.canvas);updateHit();}});
 window.addEventListener('beforeunload',()=>{clearInterval(timer);voices.destroy();behavior?.destroy();player?.destroy();});voices.play('greeting');await install(initial);
})().catch(error=>window.Anzuki?.reportStartupError(error?.stack||String(error)));
