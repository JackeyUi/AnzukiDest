/* Display-size alpha mask for interaction only. The original artwork canvas is untouched. */
(function(root){
 'use strict';
 class HitTest{
  constructor(element){this.element=element;this.canvas=document.createElement('canvas');this.context=this.canvas.getContext('2d',{willReadFrequently:true});this.ready=false;}
  update(source){const b=this.element.getBoundingClientRect(),w=Math.max(1,Math.round(b.width)),h=Math.max(1,Math.round(b.height));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
   const width=source.width||source.displayWidth,height=source.height||source.displayHeight,scale=Math.min(w/width,h/height);this.context.clearRect(0,0,w,h);this.context.drawImage(source,(w-width*scale)/2,(h-height*scale)/2,width*scale,height*scale);this.pixels=this.context.getImageData(0,0,w,h).data;this.ready=true;
  }
  contains(x,y){const b=this.element.getBoundingClientRect();x=Math.floor((x-b.left)*this.canvas.width/b.width);y=Math.floor((y-b.top)*this.canvas.height/b.height);return !!(this.ready&&x>=0&&y>=0&&x<this.canvas.width&&y<this.canvas.height&&this.pixels[(y*this.canvas.width+x)*4+3]>0);}
 }
 if(typeof module==='object'&&module.exports)module.exports={HitTest};else root.AnzukiHit={HitTest};
})(globalThis);
