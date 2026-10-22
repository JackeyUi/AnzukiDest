package com.jackeyui.anzukipet;

/** Retimes animation metadata only. Never decodes or recompresses image pixels. */
final class WebPTiming {
    private static int u32(byte[] b,int p){
        long n=(b[p]&255L)|((b[p+1]&255L)<<8)|((b[p+2]&255L)<<16)|((b[p+3]&255L)<<24);
        if(n>Integer.MAX_VALUE)throw new IllegalArgumentException("WebP too large");return (int)n;
    }
    private static boolean tag(byte[] b,int p,String s){
        if(p+s.length()>b.length)return false;
        for(int i=0;i<s.length();i++)if((b[p+i]&255)!=s.charAt(i))return false;return true;
    }
    static byte[] retime(byte[] source,double speed){
        if(Double.isNaN(speed)||speed<1||speed>2||Math.abs(speed*10-Math.round(speed*10))>1e-7)
            throw new IllegalArgumentException("Speed must be 1.0–2.0 in 0.1 steps");
        byte[] b=source.clone();
        if(b.length<12||!tag(b,0,"RIFF")||!tag(b,8,"WEBP")||u32(b,4)!=b.length-8)
            throw new IllegalArgumentException("Invalid WebP");
        int offset=12,frames=0;long total=0,scaled=0;
        while(offset<=b.length-8){
            int size=u32(b,offset+4);
            if(size>b.length-offset-8)throw new IllegalArgumentException("Truncated WebP");
            if(tag(b,offset,"ANMF")){
                if(size<16)throw new IllegalArgumentException("Invalid frame");
                int p=offset+20;total+=(b[p]&255)|((b[p+1]&255)<<8)|((b[p+2]&255)<<16);
                long target=Math.round(total/speed);int next=(int)Math.max(1,target-scaled);scaled+=next;
                b[p]=(byte)next;b[p+1]=(byte)(next>>>8);b[p+2]=(byte)(next>>>16);frames++;
            }
            offset+=8+size+(size&1);
        }
        if(offset!=b.length||frames==0)throw new IllegalArgumentException("Missing animation frames");
        return b;
    }
}
