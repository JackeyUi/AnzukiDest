/* Single local audio channel. Animation speed never changes the recording's speed. */
(function(root){
 'use strict';
 class VoicePlayer {
  constructor(snapshot,{createAudio=()=>new Audio(),now=()=>performance.now(),status=()=>{}}={}){
   this.createAudio=createAudio;this.now=now;this.status=status;this.audio=null;this.current=null;this.lastClick=-Infinity;this.destroyed=false;this.update(snapshot);
  }
  update(snapshot){this.snapshot=snapshot;const p=snapshot.settings;if(p.muted||p.volume===0)this.stop();else if(this.audio)this.audio.volume=p.volume/100;
   if(this.current&&!Object.values(snapshot.clips).flat().some(c=>c.id===this.current))this.stop();
   clearInterval(this.timer);if(!this.destroyed&&p.idleEnabled&&!p.muted&&p.volume>0)this.timer=setInterval(()=>this.play('idle'),p.idleMinutes*60000);
  }
  stop(){if(this.audio){this.audio.onended=null;this.audio.onerror=null;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();this.audio=null;}this.current=null;}
  async play(event,{id,preview=false}={}){
   const {settings:p,clips,policy}=this.snapshot;
   if(this.destroyed||p.muted||p.volume===0){if(preview)this.status('目前為靜音或音量為 0，請先開啟聲音。');return false;}
   const rules=typeof module==='object'&&module.exports?require('../pet/voice-rules.js'):root.AnzukiVoiceRules;
   const pool=preview?(clips[event]||[]).filter(c=>!c.unsupported&&rules.acceptsFilename(c.name,policy)):rules.eligible(this.snapshot,event),clip=id?pool.find(c=>c.id===id):pool[Math.floor(Math.random()*pool.length)];
   if(!clip){if(preview)this.status('請先匯入這一類的音檔。');return false;}
   if(!preview&&(this.audio||(event==='click'&&this.now()-this.lastClick<policy.clickCooldownMs)))return false;
   this.stop();if(event==='click'&&!preview)this.lastClick=this.now();
   const audio=this.createAudio();this.audio=audio;this.current=clip.id;audio.volume=p.volume/100;audio.playbackRate=1;audio.src=clip.url;
   const end=()=>{if(this.audio===audio){this.audio=null;this.current=null;}};
   audio.onended=end;audio.onerror=()=>{end();this.status('無法播放「'+clip.name+'」，此裝置無法解碼這個音檔。');};
   try{await audio.play();if(this.audio===audio)this.status('播放：'+clip.name);return this.audio===audio;}
   catch{if(this.audio!==audio)return false;end();this.status('無法播放「'+clip.name+'」，請重新匯入或確認音訊輸出。');return false;}
  }
  destroy(){this.destroyed=true;clearInterval(this.timer);this.stop();}
 }
 if(typeof module==='object'&&module.exports)module.exports={VoicePlayer};else root.AnzukiVoice={VoicePlayer};
})(globalThis);
