'use strict';
(async()=>{
 const api=window.Anzuki,config=await api.config();
 const idle=document.querySelector('#idle'),speed=document.querySelector('#speed'),label=document.querySelector('#speed-label');
 const render=p=>{idle.value=p.idle;speed.value=p.clickSpeed;label.value=Number(p.clickSpeed).toFixed(1)+'×';};
 render(config.settings);api.onSettings(render);
 idle.onchange=()=>api.setPreferences({idle:idle.value});
 speed.oninput=()=>{const value=Number(speed.value);label.value=value.toFixed(1)+'×';api.setPreferences({clickSpeed:value});};
})();
