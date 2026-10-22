/* Inspect animated WebP metadata only; source pixels are never changed. */
(function(root){
 'use strict';
 function inspect(input){
  const b=new Uint8Array(input),v=new DataView(b.buffer,b.byteOffset,b.byteLength),tag=(p,s)=>p+s.length<=b.length&&[...s].every((c,i)=>b[p+i]===c.charCodeAt(0)),u24=p=>b[p]|b[p+1]<<8|b[p+2]<<16;
  if(b.length<12||!tag(0,'RIFF')||!tag(8,'WEBP')||v.getUint32(4,true)+8!==b.length)throw Error('請使用有效的透明動態 WebP');
  let width=0,height=0,alpha=false,offset=12,total=0;const starts=[],durations=[];
  while(offset+8<=b.length){const size=v.getUint32(offset+4,true),end=offset+8+size;if(end>b.length)throw Error('動畫檔不完整');
   if(tag(offset,'VP8X')){if(size!==10)throw Error('動畫尺寸資料錯誤');width=u24(offset+12)+1;height=u24(offset+15)+1;alpha=!!(b[offset+8]&16);}
   if(tag(offset,'ANMF')){if(size<16)throw Error('動畫影格資料錯誤');const ms=u24(offset+20);if(ms<1)throw Error('動畫含零長度影格');starts.push(total);durations.push(ms);total+=ms;}
   offset=end+(size&1);
  }
  if(offset!==b.length||!width||!height||starts.length<2)throw Error('請使用至少兩幀的動態 WebP');
  return {width,height,alpha,frames:starts.length,starts,durations,durationMs:total};
 }
 const api={inspect};if(typeof module==='object'&&module.exports)module.exports=api;else root.AnzukiAnimationFormat=api;
})(globalThis);
