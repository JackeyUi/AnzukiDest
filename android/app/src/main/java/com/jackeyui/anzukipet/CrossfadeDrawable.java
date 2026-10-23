package com.jackeyui.anzukipet;

import android.graphics.*;
import android.graphics.drawable.Drawable;
import android.os.SystemClock;

/** Add premultiplied old/new layers so overlap retains its alpha during a simultaneous fade. */
final class CrossfadeDrawable extends Drawable implements Drawable.Callback {
    private final Drawable next;
    private Bitmap previous;
    private final long duration;
    private long started=-1;
    private final Paint oldPaint=new Paint(Paint.FILTER_BITMAP_FLAG),addPaint=new Paint();
    private int alpha=255;
    CrossfadeDrawable(Drawable old,Drawable next,long duration){
        this.next=next;this.duration=duration;
        if(old!=null){int width=Math.max(1,old.getIntrinsicWidth()),height=Math.max(1,old.getIntrinsicHeight());
            previous=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);Rect saved=new Rect(old.getBounds());old.setBounds(0,0,width,height);old.draw(new Canvas(previous));old.setBounds(saved);}
        addPaint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.ADD));next.setCallback(this);
    }
    @Override protected void onBoundsChange(Rect bounds){next.setBounds(bounds);}
    @Override public void draw(Canvas canvas){
        if(previous==null){next.setAlpha(alpha);next.draw(canvas);return;}
        long now=SystemClock.uptimeMillis();if(started<0)started=now;
        float t=Math.min(1f,(float)(now-started)/duration);
        if(t>=1){previous.recycle();previous=null;next.setAlpha(alpha);next.draw(canvas);return;}
        Rect b=getBounds();int outer=canvas.saveLayer(new RectF(b),null);
        oldPaint.setAlpha(Math.round(alpha*(1-t)));float scale=Math.min((float)b.width()/previous.getWidth(),(float)b.height()/previous.getHeight());float w=previous.getWidth()*scale,h=previous.getHeight()*scale;float x=b.left+(b.width()-w)/2,y=b.top+(b.height()-h)/2;canvas.drawBitmap(previous,null,new RectF(x,y,x+w,y+h),oldPaint);
        int layer=canvas.saveLayer(new RectF(b),addPaint);next.setAlpha(Math.round(alpha*t));next.draw(canvas);next.setAlpha(alpha);canvas.restoreToCount(layer);canvas.restoreToCount(outer);
        invalidateSelf();
    }
    @Override public int getIntrinsicWidth(){return next.getIntrinsicWidth();}
    @Override public int getIntrinsicHeight(){return next.getIntrinsicHeight();}
    @Override public int getOpacity(){return PixelFormat.TRANSLUCENT;}
    @Override public void setAlpha(int value){alpha=value;invalidateSelf();}
    @Override public void setColorFilter(ColorFilter filter){next.setColorFilter(filter);}
    @Override public void invalidateDrawable(Drawable who){invalidateSelf();}
    @Override public void scheduleDrawable(Drawable who,Runnable task,long when){scheduleSelf(task,when);}
    @Override public void unscheduleDrawable(Drawable who,Runnable task){unscheduleSelf(task);}
}
