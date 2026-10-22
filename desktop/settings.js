'use strict';
(async()=>{
 const api=window.Anzuki,config=await api.config();
 let voice=config.voice;const assignments=new Map();
 const idle=document.querySelector('#idle'),speed=document.querySelector('#speed'),label=document.querySelector('#speed-label');
 const render=p=>{idle.value=p.idle;speed.value=p.clickSpeed;label.value=Number(p.clickSpeed).toFixed(1)+'×';};
 render(config.settings);api.onSettings(render);
 idle.onchange=()=>api.setPreferences({idle:idle.value});
 speed.oninput=()=>{const value=Number(speed.value);label.value=value.toFixed(1)+'×';api.setPreferences({clickSpeed:value});};
 const muted=document.querySelector('#voice-muted'),volume=document.querySelector('#voice-volume'),idleEnabled=document.querySelector('#voice-idle-enabled'),interval=document.querySelector('#voice-interval'),groups=document.querySelector('#voice-clips'),status=document.querySelector('#voice-status');
 const report=message=>{status.textContent=message;};api.onVoiceStatus(report);
 function renderVoice(p){voice=p;muted.checked=p.settings.muted;volume.value=p.settings.volume;idleEnabled.checked=p.settings.idleEnabled;interval.value=p.settings.idleMinutes;
  document.querySelector('#voice-volume-label').value=p.settings.volume+'%';document.querySelector('#voice-interval-label').value=p.settings.idleMinutes+' 分鐘';interval.disabled=!p.settings.idleEnabled;
  groups.replaceChildren();for(const event of p.policy.events){
   const group=document.createElement('div');group.className='voice-group';const title=document.createElement('h3');title.textContent=event.label;group.append(title);
   const assignment=document.createElement('select');const auto=document.createElement('option');auto.value='';auto.textContent='依音檔檔名辨識台詞';assignment.append(auto);for(const line of p.catalog.lines.filter(l=>l.event===event.id)){const o=document.createElement('option');o.value=line.id;o.textContent=line.label+'：'+line.text;assignment.append(o);}const generic=document.createElement('option');generic.value='generic';generic.textContent='通用（不限時間與星期）';assignment.append(generic);assignment.value=assignments.get(event.id)||'';assignment.onchange=()=>assignments.set(event.id,assignment.value);group.append(assignment);
   const add=document.createElement('button');add.textContent='匯入音檔';add.dataset.event=event.id;add.onclick=async()=>{try{const errors=await api.importVoice(event.id,assignment.value);report(errors.length?errors.join('；'):'音檔清單已更新');}catch{report('匯入失敗，請確認檔案仍可讀取。');}};group.append(add);
   if(!p.clips[event.id].length){const empty=document.createElement('p');empty.textContent='尚未匯入音檔';group.append(empty);}
   for(const clip of p.clips[event.id]){const row=document.createElement('div');row.className='voice-row';const name=document.createElement('span');const line=p.catalog.lines.find(l=>l.id===clip.lineId);name.textContent=clip.name+' · '+(line?line.label:'通用');
    const test=document.createElement('button');test.textContent='試聽';test.onclick=()=>api.playVoice({event:event.id,id:clip.id});
    const remove=document.createElement('button');remove.textContent='移除';remove.onclick=()=>api.removeVoice(clip.id);row.append(name,test,remove);group.append(row);
   }groups.append(group);
  }
 }
 muted.onchange=()=>api.setVoicePreferences({muted:muted.checked});
 volume.oninput=()=>{document.querySelector('#voice-volume-label').value=volume.value+'%';api.setVoicePreferences({volume:Number(volume.value)});};
 idleEnabled.onchange=()=>api.setVoicePreferences({idleEnabled:idleEnabled.checked});interval.oninput=()=>api.setVoicePreferences({idleMinutes:Number(interval.value)});
 document.querySelector('#voice-stop').onclick=()=>api.stopVoice();renderVoice(voice);api.onVoiceChanged(renderVoice);
})();
