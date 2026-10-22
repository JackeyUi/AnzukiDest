package com.jackeyui.anzukipet;

import android.content.Context;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaCodecList;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.util.*;

final class VoiceStore {
    final Context context;final SharedPreferences prefs;final JSONObject policy,catalog;final File folder;
    VoiceStore(Context c) throws Exception {
        context=c.getApplicationContext();prefs=context.getSharedPreferences("voice",Context.MODE_PRIVATE);
        policy=readAsset("voice-config.json");catalog=readAsset("voice-lines.json");folder=new File(context.getFilesDir(),"voice");folder.mkdirs();
    }
    private JSONObject readAsset(String name) throws Exception {
        try(InputStream in=context.getAssets().open(name)){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return new JSONObject(out.toString("UTF-8"));}
    }
    JSONObject defaults(){return policy.optJSONObject("defaults");}
    int volume(){return Math.max(0,Math.min(100,prefs.getInt("volume",defaults().optInt("volume",70))));}
    boolean muted(){return prefs.getBoolean("muted",false);}
    boolean idleEnabled(){return prefs.getBoolean("idleEnabled",false);}
    int idleMinutes(){return Math.max(1,Math.min(10,prefs.getInt("idleMinutes",defaults().optInt("idleMinutes",3))));}
    JSONObject clips() throws Exception{return new JSONObject(prefs.getString("clips","{}"));}
    JSONArray clips(String event) throws Exception {JSONArray a=clips().optJSONArray(event);return a==null?new JSONArray():a;}
    JSONObject line(String id) throws Exception {for(String key:new String[]{"lines","legacyLines"}){JSONArray all=catalog.optJSONArray(key);if(all==null)continue;for(int i=0;i<all.length();i++){JSONObject l=all.getJSONObject(i);if(id.equals(l.getString("id")))return l;}}return null;}
    JSONObject schedule(JSONObject value) throws Exception {
        if(value==null)throw new IOException("無效的播放條件");String day=value.optString("dayType"),period=value.optString("period");boolean dayOK=false,periodOK=false;
        JSONArray days=policy.getJSONArray("dayTypes"),periods=policy.getJSONArray("periods");for(int i=0;i<days.length();i++)if(day.equals(days.getJSONObject(i).getString("id")))dayOK=true;
        for(int i=0;i<periods.length();i++)if(period.equals(periods.getJSONObject(i).getString("id")))periodOK=true;if(!dayOK||!periodOK)throw new IOException("無效的播放條件");return new JSONObject().put("dayType",day).put("period",period);
    }
    void setSchedule(String id,JSONObject value) throws Exception {JSONObject selected=schedule(value),all=clips();Iterator<String> keys=all.keys();while(keys.hasNext()){JSONArray list=all.getJSONArray(keys.next());for(int i=0;i<list.length();i++){JSONObject clip=list.getJSONObject(i);if(id.equals(clip.getString("id"))){clip.put("schedule",selected).put("lineId","generic");prefs.edit().putString("clips",all.toString()).apply();return;}}}}
    private boolean playable(File file){MediaExtractor extractor=new MediaExtractor();try{extractor.setDataSource(file.getAbsolutePath());MediaCodecList codecs=new MediaCodecList(MediaCodecList.REGULAR_CODECS);for(int i=0;i<extractor.getTrackCount();i++){MediaFormat format=extractor.getTrackFormat(i);String mime=format.getString(MediaFormat.KEY_MIME);if(mime!=null&&mime.startsWith("audio/")&&codecs.findDecoderForFormat(format)!=null)return true;}return false;}catch(Exception e){return false;}finally{extractor.release();}}

    File file(JSONObject clip) throws Exception {String name=clip.getString("file");if(!name.matches("[a-f0-9-]+\\.[a-z0-9]+"))throw new IOException("Invalid audio file");return new File(folder,name);}
    String importFile(String event,JSONObject selection,Uri uri) throws Exception {
        JSONArray events=policy.getJSONArray("events");boolean known=false;for(int i=0;i<events.length();i++)if(event.equals(events.getJSONObject(i).getString("id")))known=true;
        if(!known)throw new IOException("未知音聲分類");JSONArray list=clips(event);if(list.length()>=policy.getInt("maxClipsPerEvent"))throw new IOException("每類最多 12 段媒體檔");
        String name="audio";try(Cursor cursor=context.getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(cursor!=null&&cursor.moveToFirst())name=cursor.getString(0);}
        if(name==null||name.isEmpty())name="media";int dot=name.lastIndexOf('.');String suffix=dot<0?"":name.substring(dot+1).toLowerCase(Locale.ROOT),ext=suffix.matches("[a-z0-9]{1,12}")?suffix:"bin";
        JSONObject selected=schedule(selection);
        String id=UUID.randomUUID().toString();File target=new File(folder,id+"."+ext);long size=0;
        try(InputStream in=context.getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(target)){
            if(in==null)throw new IOException("讀取失敗");byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1){size+=n;if(size>policy.getLong("maxFileBytes"))throw new IOException("單一媒體檔最多 50 MB");out.write(b,0,n);}
            if(size==0)throw new IOException("媒體檔是空的");
        }catch(Exception e){target.delete();throw e;}
        if(!playable(target)){target.delete();throw new IOException("此裝置無法解碼此檔案的音訊");}
        JSONObject all=clips();list.put(new JSONObject().put("id",id).put("name",name).put("file",target.getName()).put("lineId","generic").put("schedule",selected));all.put(event,list);prefs.edit().putString("clips",all.toString()).apply();return name;
    }
    void remove(String id) throws Exception {
        JSONObject all=clips();Iterator<String> keys=all.keys();
        while(keys.hasNext()){String event=keys.next();JSONArray old=all.getJSONArray(event),next=new JSONArray();for(int i=0;i<old.length();i++){JSONObject c=old.getJSONObject(i);if(id.equals(c.getString("id")))file(c).delete();else next.put(c);}all.put(event,next);}
        prefs.edit().putString("clips",all.toString()).apply();
    }
    boolean contains(String id) throws Exception {JSONObject all=clips();Iterator<String> keys=all.keys();while(keys.hasNext()){JSONArray a=all.getJSONArray(keys.next());for(int i=0;i<a.length();i++)if(id.equals(a.getJSONObject(i).getString("id")))return true;}return false;}
    List<JSONObject> eligible(String event,Calendar now) throws Exception {
        List<JSONObject> result=new ArrayList<>();int best=Integer.MIN_VALUE;JSONArray list=clips(event);
        int day=(now.get(Calendar.DAY_OF_WEEK)+5)%7+1,hour=now.get(Calendar.HOUR_OF_DAY);
        for(int i=0;i<list.length();i++){
            JSONObject clip=list.getJSONObject(i);String id=clip.getString("lineId");int priority=0;
            JSONObject selected=clip.optJSONObject("schedule");
            if(selected!=null){
                try{schedule(selected);}catch(Exception e){continue;}
                String dayType=selected.getString("dayType"),period=selected.getString("period");JSONObject h=null;JSONArray periods=policy.getJSONArray("periods");for(int j=0;j<periods.length();j++){JSONObject p=periods.getJSONObject(j);if(period.equals(p.getString("id")))h=p.optJSONObject("hours");}
                if(!VoiceRules.matchesSchedule(day,hour,dayType,h==null?null:h.getInt("start"),h==null?null:h.getInt("end")))continue;
                priority=("all".equals(dayType)?0:10)+("all".equals(period)?0:10);
            }else if(!"generic".equals(id)){
                JSONObject l=line(id);if(l==null||!event.equals(l.getString("event")))continue;
                JSONArray values=l.getJSONArray("days");int[] days=new int[values.length()];for(int j=0;j<days.length;j++)days[j]=values.getInt(j);
                JSONObject h=l.optJSONObject("hours");if(!VoiceRules.matches(day,hour,days,h==null?null:h.getInt("start"),h==null?null:h.getInt("end")))continue;priority=l.getInt("priority");
            }
            if(!file(clip).isFile())continue;if(priority>best){best=priority;result.clear();}if(priority==best)result.add(clip);
        }return result;
    }
}
