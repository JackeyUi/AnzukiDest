/* Behavior decisions use elapsed monotonic time; artwork playback is a separate concern. */
(function(root){
 'use strict';
 class BehaviorController{
  constructor(player,config,settings,{now=()=>performance.now(),random=Math.random,onState=()=>{}}={}){
   this.player=player;this.config=config;this.policy=config.behavior;this.now=now;this.random=random;this.onState=onState;this.state='idle';this.serial=0;this.closed=false;this.lastActivity=now();this.settings={};this.update(settings);
  }
  update(settings){this.settings={...this.settings,...settings};this.nextActionAt=this.now()+this.minutes('actionMinutes')*60000;this.player.idle=this.settings.idle||this.config.idle;}
  minutes(key){const n=Number(this.settings[key]);return Number.isInteger(n)&&n>=5&&n<=30?n:10;}
  speed(name){return this.policy?.speeds?.[name]||1;}
  setState(state){this.state=state;this.onState(state);}
  activity(){if(!this.state.startsWith('nap'))this.lastActivity=this.now();}
  interact(){this.lastActivity=this.now();}
  async idle(){if(this.closed)return;this.serial++;this.setState('idle');this.nextActionAt=this.now()+this.minutes('actionMinutes')*60000;await this.player.setIdle(this.settings.idle||this.config.idle,{force:true,fade:true});}
  async action(name,state='action',speed=this.speed(name)){
   if(this.closed)return;const token=++this.serial;this.setState(state);
   const ok=await this.player.stream(name,{speed,fade:true});if(!this.closed&&token===this.serial)await this.idle();return ok;
  }
  async nap(){
   if(this.closed||!this.policy)return;const token=++this.serial;this.setState('nap-start');
   const ok=await this.player.stream(this.policy.nap.start,{fade:true});if(this.closed||token!==this.serial)return;
   if(!ok){await this.idle();this.lastActivity=this.now();return;}
   this.setState('nap-loop');await this.player.stream(this.policy.nap.loop,{loop:true,fade:true});
  }
  dragStart(){if(this.closed||!this.policy)return;this.interact();this.serial++;this.setState('drag');this.player.stream(this.policy.drag,{loop:true,speed:this.speed(this.policy.drag),fade:true});}
  dragEnd(){if(this.closed||this.state!=='drag')return;this.interact();return this.action(this.policy.land,'landing');}
  async click(){
   if(this.closed)return;this.interact();const token=++this.serial;this.setState('click');
   const ready=this.config.clicks.filter(n=>this.player.ready?.has(n)),pool=ready.length?ready:this.config.clicks;
   if(!pool.length)return this.idle();await this.player.click(pool[Math.floor(this.random()*pool.length)],this.settings.clickSpeed||1);
   if(!this.closed&&token===this.serial){this.setState('idle');this.nextActionAt=this.now()+this.minutes('actionMinutes')*60000;}
  }
  manual(id){this.interact();if(id==='idle')return this.idle();if(id==='nap')return this.nap();if(this.config.animations[id])return this.action(id,'manual');}
  tick(stamp=this.now()){
   if(this.closed||!this.policy||this.state!=='idle')return;
   if(this.settings.napEnabled!==false&&stamp-this.lastActivity>=this.minutes('napMinutes')*60000){this.nap();return;}
   if(this.settings.autoEnabled!==false&&stamp>=this.nextActionAt){const pool=this.policy.random.animations;if(pool.length)this.action(pool[Math.floor(this.random()*pool.length)],'automatic');}
  }
  suspend(){if(this.closed)return;this.serial++;this.setState('hidden');this.player.pause();}
  destroy(){this.closed=true;this.serial++;}
 }
 const api={BehaviorController};if(typeof module==='object'&&module.exports)module.exports=api;else root.AnzukiBehavior=api;
})(globalThis);
