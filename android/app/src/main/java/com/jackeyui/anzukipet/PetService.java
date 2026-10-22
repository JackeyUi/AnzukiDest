package com.jackeyui.anzukipet;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.content.res.Configuration;
import android.graphics.PixelFormat;
import android.graphics.drawable.Animatable2;
import android.graphics.drawable.AnimatedImageDrawable;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.Toast;

public class PetService extends Service {
    public static final String STOP="com.jackeyui.anzukipet.STOP", RESIZE="com.jackeyui.anzukipet.RESIZE", UPDATE="com.jackeyui.anzukipet.UPDATE";
    public static final String VOICE_UPDATE="com.jackeyui.anzukipet.VOICE_UPDATE",VOICE_TEST="com.jackeyui.anzukipet.VOICE_TEST",VOICE_STOP="com.jackeyui.anzukipet.VOICE_STOP";
    static boolean running=false;
    private PetVoicePlayer voices;
    private final Runnable idleVoice=new Runnable(){public void run(){if(!destroyed&&voices!=null){voices.play("idle",null,false);scheduleVoice();}}};
    private void scheduleVoice(){handler.removeCallbacks(idleVoice);if(voices!=null&&voices.store.idleEnabled()&&!voices.store.muted()&&voices.store.volume()>0)handler.postDelayed(idleVoice,voices.store.idleMinutes()*60000L);}
    private WindowManager wm; private WindowManager.LayoutParams position; private ImageView pet;
    private Drawable drawable; private PetAssets assets; private SharedPreferences prefs;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private float startX,startY; private int originX,originY; private boolean dragging,longPressed,destroyed,looping=true;
    private int dp(float n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private final Runnable longPress=()->{
        if(!dragging&&pet!=null){longPressed=true;Intent i=new Intent(this,MainActivity.class);i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);try{startActivity(i);}catch(Exception ignored){}}
    };
    @Override public void onCreate(){super.onCreate();
        NotificationManager nm=getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel("pet","Anzuki 桌寵",NotificationManager.IMPORTANCE_LOW));
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Intent stopIntent=new Intent(this,PetService.class);stopIntent.setAction(STOP);
        PendingIntent stop=PendingIntent.getService(this,1,stopIntent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification note=new Notification.Builder(this,"pet").setContentTitle("Anzuki 正在陪伴你")
            .setContentText("點此開啟設定，或按停止結束桌寵") .setSmallIcon(android.R.drawable.star_on)
            .setContentIntent(open).setOngoing(true).addAction(new Notification.Action.Builder(null,"停止",stop).build()).build();
        if(Build.VERSION.SDK_INT>=34)startForeground(1,note,ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);else startForeground(1,note);
        wm=getSystemService(WindowManager.class);prefs=getSharedPreferences("pet",MODE_PRIVATE);
        try{voices=new PetVoicePlayer(this,message->Toast.makeText(this,message,Toast.LENGTH_SHORT).show());}catch(Exception ignored){}
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent!=null&&STOP.equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
        if(!Settings.canDrawOverlays(this)){stopSelf();return START_NOT_STICKY;}
        if(intent!=null&&voices!=null){String action=intent.getAction();if(VOICE_STOP.equals(action)){voices.stop();return START_NOT_STICKY;}if(VOICE_TEST.equals(action)){voices.play(intent.getStringExtra("event"),intent.getStringExtra("clipId"),true);return START_NOT_STICKY;}if(VOICE_UPDATE.equals(action)){voices.apply();scheduleVoice();return START_NOT_STICKY;}}
        try {
            if(pet==null)createPet();
            else if(intent!=null&&RESIZE.equals(intent.getAction()))resize();
            else if(intent!=null&&UPDATE.equals(intent.getAction())&&looping)play(assets.idle(),true);
        }catch(Exception e){Toast.makeText(this,"桌寵無法顯示，請回設定檢查權限",Toast.LENGTH_LONG).show();stopSelf();}
        return START_NOT_STICKY;
    }
    private void createPet() throws Exception {
        assets=new PetAssets(this);pet=new ImageView(this);pet.setScaleType(ImageView.ScaleType.FIT_CENTER);pet.setContentDescription("Anzuki：拖曳移動，點擊彈動，長按設定");
        position=new WindowManager.LayoutParams(dp(prefs.getInt("size",160)),1,WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,PixelFormat.TRANSLUCENT);
        position.height=Math.round(position.width*assets.aspect());position.gravity=Gravity.TOP|Gravity.LEFT;
        DisplayMetrics screen=new DisplayMetrics();wm.getDefaultDisplay().getRealMetrics(screen);
        position.x=prefs.getInt("x",screen.widthPixels-position.width-dp(16));position.y=prefs.getInt("y",screen.heightPixels-position.height-dp(100));clamp();
        wm.addView(pet,position);running=true;play(assets.idle(),true);if(voices!=null){voices.play("greeting",null,false);scheduleVoice();}
        pet.setOnClickListener(v->{if(voices!=null)voices.play("click",null,false);try{play(assets.click(),false);}catch(Exception ignored){}});
        pet.setOnTouchListener((view,event)->{
            switch(event.getActionMasked()){
                case MotionEvent.ACTION_DOWN:
                    startX=event.getRawX();startY=event.getRawY();originX=position.x;originY=position.y;dragging=false;longPressed=false;handler.postDelayed(longPress,550);return true;
                case MotionEvent.ACTION_MOVE:
                    if(Math.hypot(event.getRawX()-startX,event.getRawY()-startY)>dp(8)){dragging=true;handler.removeCallbacks(longPress);}
                    if(dragging){position.x=originX+Math.round(event.getRawX()-startX);position.y=originY+Math.round(event.getRawY()-startY);clamp();try{wm.updateViewLayout(pet,position);}catch(Exception ignored){}}
                    return true;
                case MotionEvent.ACTION_UP:
                    handler.removeCallbacks(longPress);prefs.edit().putInt("x",position.x).putInt("y",position.y).apply();
                    if(!dragging&&!longPressed)view.performClick();
                    return true;
                case MotionEvent.ACTION_CANCEL:handler.removeCallbacks(longPress);return true;
            }return false;
        });
    }
    private void play(String name,boolean loop) throws Exception {
        if(destroyed||pet==null)return;
        if(drawable instanceof AnimatedImageDrawable){((AnimatedImageDrawable)drawable).clearAnimationCallbacks();((AnimatedImageDrawable)drawable).stop();}
        looping=loop;
        final Drawable next=assets.load(name,loop);drawable=next;pet.setImageDrawable(next);
        if(next instanceof AnimatedImageDrawable){AnimatedImageDrawable animation=(AnimatedImageDrawable)next;
            if(!loop)animation.registerAnimationCallback(new Animatable2.AnimationCallback(){@Override public void onAnimationEnd(Drawable ended){
                if(!destroyed&&drawable==ended)try{play(assets.idle(),true);}catch(Exception ignored){}
            }});
            animation.start();
        }
    }
    private void clamp(){DisplayMetrics screen=new DisplayMetrics();wm.getDefaultDisplay().getRealMetrics(screen);
        position.x=Math.max(0,Math.min(position.x,Math.max(0,screen.widthPixels-position.width)));
        position.y=Math.max(dp(24),Math.min(position.y,Math.max(dp(24),screen.heightPixels-position.height-dp(32))));
    }
    private void resize() throws Exception {position.width=dp(prefs.getInt("size",160));position.height=Math.round(position.width*assets.aspect());clamp();wm.updateViewLayout(pet,position);}
    @Override public void onConfigurationChanged(Configuration config){super.onConfigurationChanged(config);if(pet!=null)try{resize();}catch(Exception ignored){}}
    @Override public void onDestroy(){if(voices!=null)voices.close();destroyed=true;running=false;handler.removeCallbacksAndMessages(null);
        if(drawable instanceof AnimatedImageDrawable){((AnimatedImageDrawable)drawable).clearAnimationCallbacks();((AnimatedImageDrawable)drawable).stop();}
        if(pet!=null){try{wm.removeView(pet);}catch(Exception ignored){}pet=null;}stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent){return null;}
}
