package com.jackeyui.anzukipet;

import android.content.Context;
import android.media.*;
import android.os.SystemClock;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.*;

final class PetVoicePlayer {
    interface Status {void show(String message);}
    final VoiceStore store;private final AudioManager manager;private final Status status;
    private MediaPlayer player;private AudioFocusRequest focus;private String currentId;private long lastClick=-100000;
    PetVoicePlayer(Context context,Status status) throws Exception {store=new VoiceStore(context);manager=context.getSystemService(AudioManager.class);this.status=status;}
    void apply(){
        try{if(store.muted()||store.volume()==0||(currentId!=null&&!store.contains(currentId))){stop();return;}}
        catch(Exception ignored){stop();return;}
        if(player!=null)try{float v=store.volume()/100f;player.setVolume(v,v);}catch(IllegalStateException ignored){}
    }
    boolean play(String event,String id,boolean preview){
        if(store.muted()||store.volume()==0){if(preview)status.show("目前為靜音或音量為 0");return false;}
        if(!preview&&(player!=null||manager.getRingerMode()!=AudioManager.RINGER_MODE_NORMAL||manager.isMusicActive()))return false;
        if(!preview&&"click".equals(event)&&SystemClock.elapsedRealtime()-lastClick<store.policy.optInt("clickCooldownMs",2500))return false;
        try{
            JSONObject chosen=null;
            if(preview&&id!=null){JSONArray list=store.clips(event);for(int i=0;i<list.length();i++)if(id.equals(list.getJSONObject(i).getString("id")))chosen=list.getJSONObject(i);}
            else {List<JSONObject> list=store.eligible(event,Calendar.getInstance());if(!list.isEmpty())chosen=list.get(new Random().nextInt(list.size()));}
            if(chosen==null){if(preview)status.show("目前沒有可播放的媒體檔");return false;}
            stop();
            AudioAttributes attributes=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();
            focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(attributes).setOnAudioFocusChangeListener(change->{if(change<0)stop();}).build();
            if(manager.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED){focus=null;if(preview)status.show("目前無法取得音訊播放權限");return false;}
            final MediaPlayer next=new MediaPlayer();player=next;currentId=chosen.getString("id");next.setAudioAttributes(attributes);next.setDataSource(store.file(chosen).getAbsolutePath());float v=store.volume()/100f;next.setVolume(v,v);
            next.setOnCompletionListener(done->{if(player==done)stop();});next.setOnErrorListener((failed,what,extra)->{if(player==failed){stop();status.show("媒體檔無法解碼，請確認格式");}return true;});
            final String name=chosen.getString("name");next.setOnPreparedListener(ready->{if(player==ready){ready.start();if(preview)status.show("播放："+name);}});
            next.prepareAsync();if("click".equals(event)&&!preview)lastClick=SystemClock.elapsedRealtime();return true;
        }catch(Exception e){stop();status.show("音聲播放失敗，請確認媒體檔仍可讀取");return false;}
    }
    void stop(){MediaPlayer old=player;player=null;currentId=null;if(old!=null){old.setOnPreparedListener(null);old.setOnCompletionListener(null);old.setOnErrorListener(null);old.release();}AudioFocusRequest request=focus;focus=null;if(request!=null)manager.abandonAudioFocusRequest(request);}
    void close(){stop();}
}
