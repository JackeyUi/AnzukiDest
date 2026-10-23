package com.jackeyui.anzukipet;

import android.content.Context;
import android.graphics.ImageDecoder;
import android.graphics.drawable.AnimatedImageDrawable;
import android.graphics.drawable.Drawable;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Random;
import java.nio.ByteBuffer;

final class PetAssets {
    final JSONObject index;
    private final Context context;
    private final java.util.LinkedHashMap<String,Drawable> cache=new java.util.LinkedHashMap<String,Drawable>(4,.75f,true);
    private final AnimationStore library;
    private final Random random = new Random();
    PetAssets(Context context) throws Exception {
        this.context = context;this.library=new AnimationStore(context);
        try (InputStream in = context.getAssets().open("animations.json")) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[4096]; int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            index = new JSONObject(out.toString("UTF-8"));
            JSONArray custom=library.items();for(int i=0;i<custom.length();i++){JSONObject row=custom.getJSONObject(i);if(!library.file(row).isFile())continue;index.getJSONObject("animations").put(row.getString("id"),row);if("idle".equals(row.getString("role")))index.getJSONArray("idleOptions").put(row.getString("id"));}
        }
    }
    String idle() throws Exception {
        String chosen=context.getSharedPreferences("pet",Context.MODE_PRIVATE).getString("selected_idle",index.getString("idle"));
        JSONArray options=index.getJSONArray("idleOptions");
        for(int i=0;i<options.length();i++)if(options.getString(i).equals(chosen))return chosen;
        return index.getString("idle");
    }
    double clickSpeed(){return 1+Math.max(0,Math.min(10,context.getSharedPreferences("pet",Context.MODE_PRIVATE).getInt("click_speed_step",0)))/10.0;}

    String click() throws Exception {
        String selected=context.getSharedPreferences("pet",Context.MODE_PRIVATE).getString("click_animation","builtin");JSONObject custom=library.get(selected);if(custom!=null&&"click".equals(custom.optString("role"))&&library.file(custom).isFile())return selected;
        JSONArray choices = index.getJSONArray("clicks");
        return choices.length() == 0 ? idle() : choices.getString(random.nextInt(choices.length()));
    }
    Drawable load(String name, boolean loop) throws Exception {return load(name,loop,loop?1:clickSpeed());}
    synchronized Drawable load(String name, boolean loop,double speed) throws Exception {
        JSONObject record=index.getJSONObject("animations").getJSONObject(name);String file=record.getString("file");String key=name+":"+speed+":"+loop;if(cache.containsKey(key))return cache.get(key);
        ImageDecoder.Source source;
        if(name.startsWith("custom-")){byte[] original=java.nio.file.Files.readAllBytes(library.file(record).toPath());source=ImageDecoder.createSource(ByteBuffer.wrap(speed==1?original:WebPTiming.retime(original,speed)));}
        else if(speed==1)source=ImageDecoder.createSource(context.getAssets(),file);
        else{byte[] original;try(InputStream in=context.getAssets().open(file)){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] chunk=new byte[65536];int n;while((n=in.read(chunk))!=-1)out.write(chunk,0,n);original=out.toByteArray();}source=ImageDecoder.createSource(ByteBuffer.wrap(WebPTiming.retime(original,speed)));}
        Drawable drawable=ImageDecoder.decodeDrawable(source,(decoder,info,src)->decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE));cache.put(key,drawable);
        // Reserve the drag drawable in addition to four ordinary LRU entries. Automatic
        // actions and naps must not evict it and force asset reading/retiming on a grab.
        JSONObject behavior=index.optJSONObject("behavior");String drag=behavior==null?"":behavior.optString("drag");
        JSONObject speeds=behavior==null?null:behavior.optJSONObject("speeds");String pinned=drag+":"+(speeds==null?1.0:speeds.optDouble(drag,1))+":true";
        int limit=cache.containsKey(pinned)?5:4;
        if(cache.size()>limit)for(String candidate:new java.util.ArrayList<String>(cache.keySet()))if(!candidate.equals(pinned)){cache.remove(candidate);break;}
        if (drawable instanceof AnimatedImageDrawable) {
            ((AnimatedImageDrawable) drawable).setRepeatCount(loop ? AnimatedImageDrawable.REPEAT_INFINITE : 0);
        }
        return drawable;
    }
    float aspect() throws Exception { return (float)index.getInt("height") / index.getInt("width"); }
}
