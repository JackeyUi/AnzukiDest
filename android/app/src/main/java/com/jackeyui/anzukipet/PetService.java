package com.jackeyui.anzukipet;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.content.res.Configuration;
import android.graphics.PixelFormat;
import android.graphics.drawable.*;
import android.os.*;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.*;
import android.widget.*;
import org.json.*;
import java.util.concurrent.*;

public class PetService extends Service {
    public static final String STOP="com.jackeyui.anzukipet.STOP",RESIZE="com.jackeyui.anzukipet.RESIZE",UPDATE="com.jackeyui.anzukipet.UPDATE";
    public static final String POLICY="com.jackeyui.anzukipet.POLICY",PLAY="com.jackeyui.anzukipet.PLAY";
    public static final String SHOW="com.jackeyui.anzukipet.SHOW";
    public static final String VOICE_UPDATE="com.jackeyui.anzukipet.VOICE_UPDATE",VOICE_TEST="com.jackeyui.anzukipet.VOICE_TEST",VOICE_STOP="com.jackeyui.anzukipet.VOICE_STOP";
    static boolean running=false;
    private PetVoicePlayer voices;
    private WindowManager wm;private WindowManager.LayoutParams position;private AlphaPetView pet;
    private Drawable drawable;private PetAssets assets;private SharedPreferences prefs;private JSONObject policy;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final ExecutorService decoding=Executors.newSingleThreadExecutor();
    private final java.util.Random random=new java.util.Random();
    private float startX,startY;private int originX,originY,playSerial;private boolean dragging,longPressed,destroyed;
    private String mode="idle";private long lastActivity,nextActionAt;
    private int dp(float n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private int minutes(String key){return Math.max(5,Math.min(30,prefs.getInt(key,10)));}
    private double speed(String name){JSONObject speeds=policy.optJSONObject("speeds");return speeds==null?1:speeds.optDouble(name,1);}
    private void activity(){lastActivity=SystemClock.elapsedRealtime();}
    private void scheduleAction(){nextActionAt=SystemClock.elapsedRealtime()+minutes("action_minutes")*60000L;}
    private final Runnable idleVoice=new Runnable(){public void run(){if(!destroyed&&voices!=null){voices.play("idle",null,false);scheduleVoice();}}};
    private void scheduleVoice(){handler.removeCallbacks(idleVoice);if(voices!=null&&voices.store.idleEnabled()&&!voices.store.muted()&&voices.store.volume()>0)handler.postDelayed(idleVoice,voices.store.idleMinutes()*60000L);}
    private final Runnable tick=new Runnable(){public void run(){
        if(destroyed)return;
        try{long now=SystemClock.elapsedRealtime();if("idle".equals(mode)&&pet!=null&&pet.isShown()){
            if(prefs.getBoolean("nap_enabled",true)&&now-lastActivity>=minutes("nap_minutes")*60000L)nap();
            else if(prefs.getBoolean("auto_enabled",true)&&now>=nextActionAt){JSONArray pool=policy.getJSONObject("random").getJSONArray("animations");if(pool.length()>0)action(pool.getString(random.nextInt(pool.length())),"automatic");}
        }}catch(Exception ignored){}
        handler.postDelayed(this,1000);
    }};
    private final Runnable longPress=()->{
        if(!dragging&&pet!=null){longPressed=true;Intent i=new Intent(this,MainActivity.class);i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);try{startActivity(i);}catch(Exception ignored){}}
    };
    @Override public void onCreate(){super.onCreate();
        NotificationManager nm=getSystemService(NotificationManager.class);nm.createNotificationChannel(new NotificationChannel("pet","Anzuki 桌寵",NotificationManager.IMPORTANCE_LOW));
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Intent stopIntent=new Intent(this,PetService.class);stopIntent.setAction(STOP);
        PendingIntent stop=PendingIntent.getService(this,1,stopIntent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Intent showIntent=new Intent(this,PetService.class);showIntent.setAction(SHOW);
        PendingIntent show=PendingIntent.getService(this,2,showIntent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification note=new Notification.Builder(this,"pet").setContentTitle("Anzuki 正在陪伴你").setContentText("點此開啟設定與動畫選單").setSmallIcon(android.R.drawable.star_on).setContentIntent(open).setOngoing(true).addAction(new Notification.Action.Builder(null,"顯示桌寵",show).build()).addAction(new Notification.Action.Builder(null,"停止",stop).build()).build();
        if(Build.VERSION.SDK_INT>=34)startForeground(1,note,ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);else startForeground(1,note);
        wm=getSystemService(WindowManager.class);prefs=getSharedPreferences("pet",MODE_PRIVATE);
        try{voices=new PetVoicePlayer(this,message->Toast.makeText(this,message,Toast.LENGTH_SHORT).show());}catch(Exception ignored){}
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent!=null&&STOP.equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
        if(!Settings.canDrawOverlays(this)){stopSelf();return START_NOT_STICKY;}
        if(intent!=null&&voices!=null){String a=intent.getAction();if(VOICE_STOP.equals(a)){voices.stop();return START_NOT_STICKY;}if(VOICE_TEST.equals(a)){voices.play(intent.getStringExtra("event"),intent.getStringExtra("clipId"),true);return START_NOT_STICKY;}if(VOICE_UPDATE.equals(a)){voices.apply();scheduleVoice();return START_NOT_STICKY;}}
        try{
            if(pet==null)createPet();
            else if(intent==null||intent.getAction()==null||SHOW.equals(intent.getAction()))showPet();
            if(intent!=null){String a=intent.getAction();
                if(RESIZE.equals(a))resize();
                else if(UPDATE.equals(a)){playSerial++;assets=new PetAssets(this);policy=assets.index.getJSONObject("behavior");if(!"hidden".equals(mode))showIdle();}
                else if(POLICY.equals(a))scheduleAction();
                else if(PLAY.equals(a))manual(intent.getStringExtra("animation"));
            }
        }catch(Exception e){Toast.makeText(this,"桌寵無法顯示，請回設定檢查權限",Toast.LENGTH_LONG).show();stopSelf();}
        return START_NOT_STICKY;
    }
    private void createPet() throws Exception{
        assets=new PetAssets(this);policy=assets.index.getJSONObject("behavior");pet=new AlphaPetView(this);pet.setScaleType(ImageView.ScaleType.FIT_CENTER);pet.setContentDescription("Anzuki：拖曳抓起，放手落地，長按設定");
        position=new WindowManager.LayoutParams(dp(prefs.getInt("size",160)),1,WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,PixelFormat.TRANSLUCENT);
        position.height=Math.round(position.width*assets.aspect());position.gravity=Gravity.TOP|Gravity.LEFT;
        DisplayMetrics screen=new DisplayMetrics();wm.getDefaultDisplay().getRealMetrics(screen);
        position.x=prefs.getInt("x",screen.widthPixels-position.width-dp(16));position.y=prefs.getInt("y",screen.heightPixels-position.height-dp(100));clamp();
        wm.addView(pet,position);running=true;activity();showIdle();handler.postDelayed(tick,1000);
        if(voices!=null){voices.play("greeting",null,false);scheduleVoice();}
        pet.setOnClickListener(v->{activity();try{mode="click";play(assets.click(),false,assets.clickSpeed(),this::showIdle,false);}catch(Exception ignored){showIdle();}});
        pet.setOnTouchListener((view,event)->{
            switch(event.getActionMasked()){
                case MotionEvent.ACTION_DOWN:
                    if(!pet.hits(event.getX(),event.getY()))return false;
                    activity();if(mode.startsWith("nap"))showIdle();startX=event.getRawX();startY=event.getRawY();originX=position.x;originY=position.y;dragging=false;longPressed=false;handler.postDelayed(longPress,550);return true;
                case MotionEvent.ACTION_MOVE:
                    if(!dragging&&Math.hypot(event.getRawX()-startX,event.getRawY()-startY)>dp(8)){dragging=true;handler.removeCallbacks(longPress);activity();mode="drag";play(policy.optString("drag"),true,speed(policy.optString("drag")),null,true);}
                    if(dragging){activity();position.x=originX+Math.round(event.getRawX()-startX);position.y=originY+Math.round(event.getRawY()-startY);clamp();try{wm.updateViewLayout(pet,position);}catch(Exception ignored){}}
                    return true;
                case MotionEvent.ACTION_UP:
                    handler.removeCallbacks(longPress);activity();prefs.edit().putInt("x",position.x).putInt("y",position.y).apply();
                    if(dragging){DisplayMetrics edgeDisplay=new DisplayMetrics();wm.getDefaultDisplay().getRealMetrics(edgeDisplay);if(event.getRawY()-startY>=dp(24)&&event.getRawY()>=edgeDisplay.heightPixels-dp(32+24))hidePet();else action(policy.optString("land"),"landing");}else if(!longPressed)view.performClick();dragging=false;return true;
                case MotionEvent.ACTION_CANCEL:
                    handler.removeCallbacks(longPress);if(dragging){activity();action(policy.optString("land"),"landing");}dragging=false;return true;
            }return false;
        });
    }
    private void showIdle(){if(destroyed)return;mode="idle";scheduleAction();try{play(assets.idle(),true,1,null,true);}catch(Exception ignored){}}
    private void hidePet(){playSerial++;mode="hidden";if(drawable instanceof AnimatedImageDrawable){((AnimatedImageDrawable)drawable).clearAnimationCallbacks();((AnimatedImageDrawable)drawable).stop();}pet.setVisibility(View.INVISIBLE);}
    private void showPet(){if(destroyed||pet==null)return;pet.setVisibility(View.VISIBLE);activity();showIdle();}
    private void action(String name,String state){mode=state;play(name,false,speed(name),this::showIdle,true);}
    private void nap(){
        try{JSONObject n=policy.getJSONObject("nap");mode="nap-start";play(n.getString("start"),false,1,()->{if(!destroyed&&"nap-start".equals(mode)){mode="nap-loop";play(n.optString("loop"),true,1,null,true);}},true);}
        catch(Exception ignored){activity();showIdle();}
    }
    private void manual(String id){
        if(id==null)return;if("hidden".equals(mode))showPet();activity();if("idle".equals(id)){showIdle();return;}if("nap".equals(id)){nap();return;}
        JSONArray options=policy.optJSONArray("manual");if(options!=null)for(int i=0;i<options.length();i++)if(id.equals(options.optJSONObject(i).optString("id"))){action(id,"manual");return;}
    }
    private void play(String name,boolean loop,double speed,Runnable finished,boolean fade){
        if(destroyed||pet==null)return;final int serial=++playSerial;final PetAssets library=assets;
        decoding.execute(()->{
            try{Drawable next=library.load(name,loop,speed);handler.post(()->{
                if(destroyed||serial!=playSerial)return;
                if(drawable instanceof AnimatedImageDrawable){((AnimatedImageDrawable)drawable).clearAnimationCallbacks();((AnimatedImageDrawable)drawable).stop();}
                Drawable old=pet.getDrawable();drawable=next;
                if(next instanceof AnimatedImageDrawable){AnimatedImageDrawable animation=(AnimatedImageDrawable)next;animation.clearAnimationCallbacks();animation.setRepeatCount(loop?AnimatedImageDrawable.REPEAT_INFINITE:0);
                    if(!loop&&finished!=null)animation.registerAnimationCallback(new Animatable2.AnimationCallback(){@Override public void onAnimationEnd(Drawable ended){if(!destroyed&&serial==playSerial&&drawable==ended)finished.run();}});
                }
                pet.setImageDrawable(fade&&old!=null?new CrossfadeDrawable(old,next,policy.optInt("crossfadeMs",250)):next);
                if(voices!=null)voices.playAnimation(name,"click".equals(mode)?"click":null);
                if(next instanceof AnimatedImageDrawable)((AnimatedImageDrawable)next).start();
                else if(!loop&&finished!=null)finished.run();
            });}catch(Exception e){handler.post(()->{if(!destroyed&&serial==playSerial){Toast.makeText(this,"動畫載入失敗",Toast.LENGTH_SHORT).show();activity();if(!"idle".equals(mode))showIdle();}});}
        });
    }
    private void clamp(){DisplayMetrics s=new DisplayMetrics();wm.getDefaultDisplay().getRealMetrics(s);position.x=Math.max(0,Math.min(position.x,Math.max(0,s.widthPixels-position.width)));position.y=Math.max(dp(24),Math.min(position.y,Math.max(dp(24),s.heightPixels-position.height-dp(32))));}
    private void resize() throws Exception{position.width=dp(prefs.getInt("size",160));position.height=Math.round(position.width*assets.aspect());clamp();wm.updateViewLayout(pet,position);}
    @Override public void onConfigurationChanged(Configuration config){super.onConfigurationChanged(config);if(pet!=null)try{resize();}catch(Exception ignored){}}
    @Override public void onDestroy(){
        destroyed=true;playSerial++;running=false;handler.removeCallbacksAndMessages(null);decoding.shutdownNow();if(voices!=null)voices.close();
        if(drawable instanceof AnimatedImageDrawable){((AnimatedImageDrawable)drawable).clearAnimationCallbacks();((AnimatedImageDrawable)drawable).stop();}
        if(pet!=null){try{wm.removeView(pet);}catch(Exception ignored){}pet=null;}stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent){return null;}
}
