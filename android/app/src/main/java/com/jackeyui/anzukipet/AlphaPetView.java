package com.jackeyui.anzukipet;
import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.widget.ImageView;
/** Hit-test-only bitmap follows the drawable's current frame. Artwork keeps its native resolution. */
final class AlphaPetView extends ImageView {
    private Bitmap mask;private Canvas maskCanvas;private int[] pixels;private boolean ready;
    AlphaPetView(Context context){super(context);}
    boolean hits(float x,float y){int px=(int)Math.floor(x),py=(int)Math.floor(y);return ready&&px>=0&&py>=0&&px<getWidth()&&py<getHeight()&&(pixels[py*getWidth()+px]>>>24)>0;}
    @Override public boolean dispatchTouchEvent(android.view.MotionEvent event){if(event.getActionMasked()==android.view.MotionEvent.ACTION_DOWN&&!hits(event.getX(),event.getY()))return false;return super.dispatchTouchEvent(event);}
    @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);int width=getWidth(),height=getHeight();Drawable d=getDrawable();if(width<1||height<1||d==null)return;
        if(mask==null||mask.getWidth()!=width||mask.getHeight()!=height){if(mask!=null)mask.recycle();mask=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);maskCanvas=new Canvas(mask);pixels=new int[width*height];}
        mask.eraseColor(Color.TRANSPARENT);int save=maskCanvas.save();maskCanvas.translate(getPaddingLeft(),getPaddingTop());maskCanvas.concat(getImageMatrix());d.draw(maskCanvas);maskCanvas.restoreToCount(save);mask.getPixels(pixels,0,width,0,0,width,height);ready=true;
        if(Build.VERSION.SDK_INT>=33&&getRootSurfaceControl()!=null){Region region=new Region();for(int y=0;y<height;y++){int x=0;while(x<width){while(x<width&&(pixels[y*width+x]>>>24)==0)x++;int start=x;while(x<width&&(pixels[y*width+x]>>>24)>0)x++;if(start<x)region.op(start,y,x,y+1,Region.Op.UNION);}}getRootSurfaceControl().setTouchableRegion(region);}
    }
    @Override protected void onDetachedFromWindow(){super.onDetachedFromWindow();if(mask!=null){mask.recycle();mask=null;}ready=false;}
}
