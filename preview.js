'use strict';
const index=window.ANZUKI_ASSETS,pet=document.querySelector('#pet'),stage=document.querySelector('#stage');
const labels={'idle-loop-long':'長循環待機','idle-loop-short':'短循環待機','click-bounce-1':'點擊彈動一','click-bounce-2':'點擊彈動二'};
let serial=0,timer,selectedIdle=index.idle;
const idleChoice=document.querySelector('#idle-choice');idleChoice.value=selectedIdle;
idleChoice.onchange=()=>{selectedIdle=idleChoice.value;play(selectedIdle);};
function play(name,once=false){clearTimeout(timer);const token=++serial;pet.onload=()=>{if(token!==serial)return;document.querySelector('#status').textContent=(labels[name]||name)+' · 原始 '+pet.naturalWidth+'×'+pet.naturalHeight+' 像素';if(once)timer=setTimeout(()=>play(selectedIdle),index.animations[name].durationMs);};pet.src='pet/anzuki-animation/'+index.animations[name].file+'?play='+token;}
pet.onclick=()=>play(index.clicks[Math.floor(Math.random()*index.clicks.length)],true);
document.querySelector('#theme').onclick=()=>stage.classList.toggle('light');
document.querySelector('#zoom').onclick=()=>stage.classList.toggle('native');
document.querySelector('#idle').onclick=()=>play(selectedIdle);
for(const name of [...index.idleOptions,...index.clicks]){const b=document.createElement('button');b.textContent=labels[name]||name;b.onclick=()=>play(name,index.clicks.includes(name));document.querySelector('#actions').append(b);const card=document.createElement('div');card.className='card';const image=new Image();image.src='pet/anzuki-animation/'+index.animations[name].file;image.alt=labels[name]||name;const title=document.createElement('strong');title.textContent=image.alt;card.append(image,title);document.querySelector('#gallery').append(card);}
play(selectedIdle);
