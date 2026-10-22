package com.jackeyui.anzukipet;

import android.content.Context;
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
    JSONObject line(String id) throws Exception {JSONArray all=catalog.getJSONArray("lines");for(int i=0;i<all.length();i++){JSONObject l=all.getJSONObject(i);if(id.equals(l.getString("id")))return l;}return null;}
    File file(JSONObject clip) throws Exception {String name=clip.getString("file");if(!name.matches("[a-f0-9-]+\\.[a-z0-9]+"))throw new IOException("Invalid audio file");return new File(folder,name);}
    String importFile(String event,String assignment,Uri uri) throws Exception {
        JSONArray events=policy.getJSONArray("events");boolean known=false;for(int i=0;i<events.length();i++)if(event.equals(events.getJSONObject(i).getString("id")))known=true;
        if(!known)throw new IOException("未知音聲分類");JSONArray list=clips(event);if(list.length()>=policy.getInt("maxClipsPerEvent"))throw new IOException("每類最多 12 段音檔");
        String name="audio";try(Cursor cursor=context.getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(cursor!=null&&cursor.moveToFirst())name=cursor.getString(0);}
        int dot=name.lastIndexOf('.');if(dot<0)throw new IOException("音檔需要副檔名");String ext=name.substring(dot+1).toLowerCase(Locale.ROOT);
        JSONArray extensions=policy.getJSONArray("extensions");known=false;for(int i=0;i<extensions.length();i++)if(ext.equals(extensions.getString(i)))known=true;if(!known)throw new IOException("不支援此音檔格式");
        String lineId=assignment.isEmpty()?name.substring(0,dot).split("__",2)[0]:assignment;
        JSONObject line=line(lineId);if(!lineId.equals("generic")&&(line==null||!event.equals(line.getString("event"))))throw new IOException("請依文本檔名命名，或先選對應台詞");
        String id=UUID.randomUUID().toString();File target=new File(folder,id+"."+ext);long size=0;
        try(InputStream in=context.getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(target)){
            if(in==null)throw new IOException("讀取失敗");byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1){size+=n;if(size>policy.getLong("maxFileBytes"))throw new IOException("單一音檔最多 50 MB");out.write(b,0,n);}
            if(size==0)throw new IOException("音檔是空的");
        }catch(Exception e){target.delete();throw e;}
        JSONObject all=clips();list.put(new JSONObject().put("id",id).put("name",name).put("file",target.getName()).put("lineId",lineId));all.put(event,list);prefs.edit().putString("clips",all.toString()).apply();return name;
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
            if(!"generic".equals(id)){
                JSONObject l=line(id);if(l==null||!event.equals(l.getString("event")))continue;
                JSONArray values=l.getJSONArray("days");int[] days=new int[values.length()];for(int j=0;j<days.length;j++)days[j]=values.getInt(j);
                JSONObject h=l.optJSONObject("hours");if(!VoiceRules.matches(day,hour,days,h==null?null:h.getInt("start"),h==null?null:h.getInt("end")))continue;priority=l.getInt("priority");
            }
            if(!file(clip).isFile())continue;if(priority>best){best=priority;result.clear();}if(priority==best)result.add(clip);
        }return result;
    }
}
