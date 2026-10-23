'use strict';
(async()=>{
 const api=window.Anzuki;let config=await api.config();const choices=new Map();
 document.querySelector('#recover-pet').onclick=()=>api.recover();
 const idle=document.querySelector('#idle'),speed=document.querySelector('#speed'),label=document.querySelector('#speed-label');
 const clickChoice=document.querySelector('#click-animation');
 const render=p=>{idle.value=p.idle;clickChoice.value=p.clickAnimation||'builtin';speed.value=p.clickSpeed;label.value=Number(p.clickSpeed).toFixed(1)+'×';for(const [key,id] of [['napMinutes','nap-minutes'],['actionMinutes','action-minutes']]){document.querySelector('#'+id).value=p[key]||10;document.querySelector('#'+id+'-label').value=(p[key]||10)+' 分鐘';}document.querySelector('#nap-enabled').checked=p.napEnabled!==false;document.querySelector('#auto-enabled').checked=p.autoEnabled!==false;};
 function library(next){config=next;idle.replaceChildren();for(const [i,name] of next.idleOptions.entries()){const option=document.createElement('option');option.value=name;option.textContent=next.animations[name].label||(i===0?'長循環':'短循環');idle.append(option);}clickChoice.replaceChildren();for(const item of next.clickOptions||[{id:'builtin',label:'內建隨機'}]){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;clickChoice.append(option);}render(next.settings);
  const list=document.querySelector('#animation-library');list.replaceChildren();for(const item of next.custom||[]){const row=document.createElement('div');row.className='voice-row';const name=document.createElement('strong');name.textContent=item.label+' · '+(item.role==='idle'?'待機':'點擊')+' · '+item.width+'×'+item.height+' · '+item.frames+' 幀';const remove=document.createElement('button');remove.textContent='移除';remove.onclick=async()=>{try{await api.removeAnimation(item.id);}catch{document.querySelector('#animation-status').textContent='移除失敗';}};row.append(name,remove);list.append(row);}}
 library(config);api.onLibrary(library);api.onSettings(render);clickChoice.onchange=()=>api.setPreferences({clickAnimation:clickChoice.value});
 const manual=document.querySelector('#manual-animation');for(const item of config.behavior?.manual||[]){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;manual.append(option);}document.querySelector('#play-animation').onclick=()=>api.playAnimation(manual.value);document.querySelector('#wake-animation').onclick=()=>api.playAnimation('idle');
 for(const [key,id] of [['napMinutes','nap-minutes'],['actionMinutes','action-minutes']])document.querySelector('#'+id).oninput=e=>{document.querySelector('#'+id+'-label').value=e.target.value+' 分鐘';api.setPreferences({[key]:Number(e.target.value)});};
 document.querySelector('#nap-enabled').onchange=e=>api.setPreferences({napEnabled:e.target.checked});document.querySelector('#auto-enabled').onchange=e=>api.setPreferences({autoEnabled:e.target.checked});
 for(const role of ['idle','click']){const button=document.querySelector('#import-'+role);button.onclick=async()=>{button.disabled=true;const status=document.querySelector('#animation-status');status.textContent='請選擇透明動態 WebP；匯入時會檢查影格。';try{const item=await api.importAnimation(role);status.textContent=item?'已原樣匯入並套用：'+item.label:'已取消';}catch(error){status.textContent=String(error.message).split('Error: ').pop();}finally{button.disabled=false;}};}
idle.onchange=()=>api.setPreferences({idle:idle.value});
 speed.oninput=()=>{const value=Number(speed.value);label.value=value.toFixed(1)+'×';api.setPreferences({clickSpeed:value});};
 const muted=document.querySelector('#voice-muted'),volume=document.querySelector('#voice-volume'),idleEnabled=document.querySelector('#voice-idle-enabled'),interval=document.querySelector('#voice-interval'),groups=document.querySelector('#voice-clips'),status=document.querySelector('#voice-status');
 const report=message=>{status.textContent=message;};api.onVoiceStatus(report);
 function scheduleFields(parent,policy,value,prefix){
  const box=document.createElement('div');box.className='schedule-fields';const selects={};
  for(const [key,label,items] of [['dayType','播放日',policy.dayTypes],['period','時段',policy.periods]]){
   const wrap=document.createElement('label');wrap.textContent=label;const select=document.createElement('select');select.setAttribute('aria-label',prefix+' '+label);
   for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;select.append(option);}select.value=value[key];wrap.append(select);box.append(wrap);selects[key]=select;
  }parent.append(box);return {value:()=>({dayType:selects.dayType.value,period:selects.period.value}),onChange:fn=>Object.values(selects).forEach(s=>s.onchange=fn)};
 }
 function renderVoice(p){muted.checked=p.settings.muted;volume.value=p.settings.volume;idleEnabled.checked=p.settings.idleEnabled;interval.value=p.settings.idleMinutes;
  document.querySelector('#voice-volume-label').value=p.settings.volume+'%';document.querySelector('#voice-interval-label').value=p.settings.idleMinutes+' 分鐘';interval.disabled=!p.settings.idleEnabled;
  groups.replaceChildren();for(const event of p.policy.events){
   const group=document.createElement('section');group.className='voice-group';const title=document.createElement('h3');title.textContent=event.label;group.append(title);
   const hint=document.createElement('p');hint.textContent='選擇播放條件，再加入你的檔案。檔名自由，不必對應預設台詞。';group.append(hint);
   const fields=scheduleFields(group,p.policy,choices.get(event.id)||{dayType:'all',period:'all'},event.label+' 新檔案');fields.onChange(()=>choices.set(event.id,fields.value()));
   const add=document.createElement('button');add.textContent='＋ 加入音檔';add.className='import-button';add.dataset.event=event.id;
   add.onclick=async()=>{add.disabled=true;report('請選擇音檔；不接受影片。');try{const errors=await api.importVoice(event.id,fields.value());report(errors.length?errors.join('；'):'檔案清單已更新');}catch{report('匯入失敗，請確認檔案仍可讀取。');}finally{add.disabled=false;}};group.append(add);
   if(!p.clips[event.id].length){const empty=document.createElement('p');empty.className='empty';empty.textContent='尚無檔案。可一次選取多個音檔，檔名自由。';group.append(empty);}
   for(const clip of p.clips[event.id]){
    const row=document.createElement('article');row.className='voice-row';const name=document.createElement('strong');name.textContent=clip.name;row.append(name);
    if(!clip.schedule){const legacy=document.createElement('p');legacy.textContent='保留舊版播放條件；按「套用條件」後改用下方設定。';row.append(legacy);}
    const schedule=scheduleFields(row,p.policy,clip.schedule||{dayType:'all',period:'all'},clip.name);
    const buttons=document.createElement('div');buttons.className='clip-actions';const save=document.createElement('button');save.textContent='套用條件';save.onclick=async()=>{try{await api.setVoiceSchedule(clip.id,schedule.value());report('已儲存播放條件');}catch{report('條件儲存失敗');}};
    const test=document.createElement('button');test.textContent=clip.unsupported?'僅接受音檔':'播放';test.disabled=!!clip.unsupported;test.onclick=()=>api.playVoice({event:event.id,id:clip.id});
    const remove=document.createElement('button');remove.textContent='移除';remove.onclick=()=>api.removeVoice(clip.id);buttons.append(test,save,remove);row.append(buttons);group.append(row);
   }groups.append(group);
  }
 }
 muted.onchange=()=>api.setVoicePreferences({muted:muted.checked});volume.oninput=()=>{document.querySelector('#voice-volume-label').value=volume.value+'%';api.setVoicePreferences({volume:Number(volume.value)});};
 idleEnabled.onchange=()=>api.setVoicePreferences({idleEnabled:idleEnabled.checked});interval.oninput=()=>api.setVoicePreferences({idleMinutes:Number(interval.value)});
 document.querySelector('#voice-stop').onclick=()=>api.stopVoice();renderVoice(config.voice);api.onVoiceChanged(renderVoice);
})();
