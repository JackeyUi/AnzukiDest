package com.jackeyui.anzukipet;
import android.content.*;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.graphics.ImageDecoder;
import android.graphics.drawable.AnimatedImageDrawable;
import org.json.*;
import java.io.*;
import java.util.*;
import java.security.MessageDigest;
final class AnimationStore {
    final Context context;final SharedPreferences prefs;final File folder;
    AnimationStore(Context context){this.context=context.getApplicationContext();prefs=context.getSharedPreferences("animation-library",Context.MODE_PRIVATE);folder=new File(context.getFilesDir(),"animations");folder.mkdirs();}
    JSONArray items() throws Exception{return new JSONArray(prefs.getString("items","[]"));}
    JSONObject get(String id) throws Exception {JSONArray items=items();for(int i=0;i<items.length();i++){JSONObject row=items.getJSONObject(i);if(id.equals(row.optString("id")))return row;}return null;}
    File file(JSONObject item) throws Exception{String id=item.getString("id");if(!id.matches("custom-[a-f0-9-]+"))throw new IOException("無效動畫 ID");return new File(folder,id+".webp");}
    JSONObject importFile(Uri uri,String role) throws Exception{
        if(!role.equals("idle")&&!role.equals("click"))throw new IOException("未知動畫用途");JSONArray list=items();if(list.length()>=10)throw new IOException("最多保留 10 段自訂動畫");
        String name="自訂動畫.webp";try(Cursor c=context.getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst())name=c.getString(0);}
        String id="custom-"+UUID.randomUUID();File target=new File(folder,id+".webp");long total=0;
        try(InputStream in=context.getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(target)){if(in==null)throw new IOException("讀取失敗");byte[] chunk=new byte[65536];int n;while((n=in.read(chunk))!=-1){total+=n;if(total>104857600)throw new IOException("單一動畫最多 100 MB");out.write(chunk,0,n);}}catch(Exception e){target.delete();throw e;}
        try{byte[] bytes=java.nio.file.Files.readAllBytes(target.toPath());AnimationInfo info=AnimationInfo.inspect(bytes);if(!info.alpha)throw new IOException("請提供透明背景的動畫，無法自動移除實色背景");
            if(info.width>4096||info.height>4096||info.frames>1000||(role.equals("click")&&(long)info.width*info.height*info.frames>100000000))throw new IOException("動畫超過播放記憶體上限，請縮短動畫，不需降低畫質");
            if(!(ImageDecoder.decodeDrawable(ImageDecoder.createSource(target)) instanceof AnimatedImageDrawable))throw new IOException("動畫無法解碼");
            byte[] digest=MessageDigest.getInstance("SHA-256").digest(bytes);StringBuilder sha=new StringBuilder();for(byte b:digest)sha.append(String.format(Locale.ROOT,"%02x",b&255));
            JSONObject row=new JSONObject().put("id",id).put("file",target.getName()).put("label",name).put("role",role).put("width",info.width).put("height",info.height).put("frames",info.frames).put("durationMs",info.durationMs).put("sha256",sha.toString());list.put(row);prefs.edit().putString("items",list.toString()).apply();return row;
        }catch(Exception e){target.delete();throw e;}
    }
    void remove(String id) throws Exception{JSONArray all=items(),next=new JSONArray();for(int i=0;i<all.length();i++){JSONObject item=all.getJSONObject(i);if(id.equals(item.getString("id")))file(item).delete();else next.put(item);}prefs.edit().putString("items",next.toString()).apply();}
}
