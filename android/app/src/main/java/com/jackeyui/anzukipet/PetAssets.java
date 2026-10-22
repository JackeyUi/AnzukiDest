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
    String idle() throws Exception { return index.getString("idle"); }
    String click() throws Exception {
        JSONArray choices = index.getJSONArray("clicks");
        return choices.length() == 0 ? idle() : choices.getString(random.nextInt(choices.length()));
    }
    Drawable load(String name, boolean loop) throws Exception {
        String file = index.getJSONObject("animations").getJSONObject(name).getString("file");
        Drawable drawable = ImageDecoder.decodeDrawable(ImageDecoder.createSource(context.getAssets(), file));
        if (drawable instanceof AnimatedImageDrawable) {
            ((AnimatedImageDrawable) drawable).setRepeatCount(loop ? AnimatedImageDrawable.REPEAT_INFINITE : 0);
        }
        return drawable;
    }
    float aspect() throws Exception { return (float)index.getInt("height") / index.getInt("width"); }
}
