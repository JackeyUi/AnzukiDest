package com.jackeyui.anzukipet;

final class VoiceRules {
    static boolean matches(int day,int hour,int[] days,Integer start,Integer end){
        if(days.length>0){boolean found=false;for(int d:days)if(d==day)found=true;if(!found)return false;}
        return start==null||(start<end?hour>=start&&hour<end:hour>=start||hour<end);
    }
}
