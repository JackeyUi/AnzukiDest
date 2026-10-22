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
    private final Random random = new Random();
    PetAssets(Context context) throws Exception {
        this.context = context;
        try (InputStream in = context.getAssets().open("animations.json")) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[4096]; int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            index = new JSONObject(out.toString("UTF-8"));
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
        JSONArray choices = index.getJSONArray("clicks");
        return choices.length() == 0 ? idle() : choices.getString(random.nextInt(choices.length()));
    }
    Drawable load(String name, boolean loop) throws Exception {
        String file = index.getJSONObject("animations").getJSONObject(name).getString("file");
        double speed=loop?1:clickSpeed();
        Drawable drawable;
        if(speed==1)drawable=ImageDecoder.decodeDrawable(ImageDecoder.createSource(context.getAssets(), file));
        else {
            byte[] original;
            try(InputStream in=context.getAssets().open(file)){
                ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] chunk=new byte[65536];int n;
                while((n=in.read(chunk))!=-1)out.write(chunk,0,n);original=out.toByteArray();
            }
            drawable=ImageDecoder.decodeDrawable(ImageDecoder.createSource(ByteBuffer.wrap(WebPTiming.retime(original,speed))));
        }
        if (drawable instanceof AnimatedImageDrawable) {
            ((AnimatedImageDrawable) drawable).setRepeatCount(loop ? AnimatedImageDrawable.REPEAT_INFINITE : 0);
        }
        return drawable;
    }
    float aspect() throws Exception { return (float)index.getInt("height") / index.getInt("width"); }
}
