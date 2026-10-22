/* Change only ANMF duration fields. Compressed image/alpha bytes remain untouched. */
(function(root){
 'use strict';
 function retime(input,speed=1){
  if(!Number.isFinite(speed)||speed<1||speed>2||Math.abs(speed*10-Math.round(speed*10))>1e-7)throw new Error('Speed must be 1.0–2.0 in 0.1 steps');
  const bytes=new Uint8Array(input).slice(),view=new DataView(bytes.buffer);
  const tag=(p,s)=>p+s.length<=bytes.length&&[...s].every((c,i)=>bytes[p+i]===c.charCodeAt(0));
  if(!tag(0,'RIFF')||!tag(8,'WEBP')||view.getUint32(4,true)+8!==bytes.length)throw new Error('Invalid WebP');
  let offset=12,total=0,scaled=0,frames=0;
  while(offset+8<=bytes.length){
   const size=view.getUint32(offset+4,true),end=offset+8+size;
   if(end>bytes.length)throw new Error('Truncated WebP');
   if(tag(offset,'ANMF')){
    if(size<16)throw new Error('Invalid frame');
    const p=offset+20,duration=bytes[p]|bytes[p+1]<<8|bytes[p+2]<<16;
    total+=duration;const target=Math.round(total/speed),next=Math.max(1,target-scaled);scaled+=next;
    bytes[p]=next&255;bytes[p+1]=(next>>>8)&255;bytes[p+2]=(next>>>16)&255;frames++;
   }
   offset=end+(size&1);
  }
  if(offset!==bytes.length||!frames)throw new Error('Missing WebP animation frames');
  return {bytes,durationMs:scaled,frames};
 }
 const api={retime};if(typeof module==='object'&&module.exports)module.exports=api;else root.AnzukiTiming=api;
})(globalThis);
