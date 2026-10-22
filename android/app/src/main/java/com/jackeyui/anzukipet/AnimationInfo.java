package com.jackeyui.anzukipet;
final class AnimationInfo {
    int width,height,frames;long durationMs;boolean alpha;
    private static boolean tag(byte[] b,int p,String s){if(p+s.length()>b.length)return false;for(int i=0;i<s.length();i++)if((b[p+i]&255)!=s.charAt(i))return false;return true;}
    private static int u24(byte[] b,int p){return (b[p]&255)|((b[p+1]&255)<<8)|((b[p+2]&255)<<16);}
    private static long u32(byte[] b,int p){return (b[p]&255L)|((b[p+1]&255L)<<8)|((b[p+2]&255L)<<16)|((b[p+3]&255L)<<24);}
    static AnimationInfo inspect(byte[] b){
        if(b.length<12||!tag(b,0,"RIFF")||!tag(b,8,"WEBP")||u32(b,4)+8!=b.length)throw new IllegalArgumentException("請使用有效的透明動態 WebP");
        AnimationInfo info=new AnimationInfo();int offset=12;
        while(offset<=b.length-8){long size=u32(b,offset+4);if(size>b.length-offset-8)throw new IllegalArgumentException("動畫檔不完整");
            if(tag(b,offset,"VP8X")){if(size!=10)throw new IllegalArgumentException("尺寸資料錯誤");info.width=u24(b,offset+12)+1;info.height=u24(b,offset+15)+1;info.alpha=(b[offset+8]&16)!=0;}
            if(tag(b,offset,"ANMF")){if(size<16)throw new IllegalArgumentException("影格資料錯誤");int ms=u24(b,offset+20);if(ms<1)throw new IllegalArgumentException("動畫含零長度影格");info.frames++;info.durationMs+=ms;}
            offset+=8+(int)size+((int)size&1);
        }
        if(offset!=b.length||info.width<1||info.height<1||info.frames<2)throw new IllegalArgumentException("請使用至少兩幀的動態 WebP");return info;
    }
}
