package com.jackeyui.anzukipet;

final class VoiceRules {
    static boolean matchesSchedule(int day,int hour,String dayType,Integer start,Integer end){
        boolean holiday=day>=6;if(!"all".equals(dayType)&&!("holiday".equals(dayType)?holiday:"weekday".equals(dayType)&&!holiday))return false;
        return matches(day,hour,new int[0],start,end);
    }
    static boolean matches(int day,int hour,int[] days,Integer start,Integer end){
        if(days.length>0){boolean found=false;for(int d:days)if(d==day)found=true;if(!found)return false;}
        return start==null||(start<end?hour>=start&&hour<end:hour>=start||hour<end);
    }
}
