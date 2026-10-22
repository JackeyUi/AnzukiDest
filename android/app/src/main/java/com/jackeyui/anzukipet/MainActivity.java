package com.jackeyui.anzukipet;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.AnimatedImageDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private boolean waitingForOverlay;
    private TextView status;
    private ImageView preview;
    private Drawable previewDrawable;
    private SharedPreferences prefs;
    private int dp(float n) { return Math.round(n * getResources().getDisplayMetrics().density); }
    private TextView text(String value, int size, int color) {
        TextView t = new TextView(this); t.setText(value); t.setTextSize(size); t.setTextColor(color);
        t.setPadding(0, dp(8), 0, dp(8)); return t;
    }
    private Button button(String value, int background, int foreground) {
        Button b = new Button(this); b.setText(value); b.setTextSize(16); b.setAllCaps(false);
        b.setTextColor(foreground); GradientDrawable shape = new GradientDrawable();
        shape.setColor(background); shape.setCornerRadius(dp(16)); b.setBackground(shape);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, dp(54));
        lp.topMargin = dp(12); b.setLayoutParams(lp); return b;
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("pet", MODE_PRIVATE);
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true); scroll.setBackgroundColor(Color.rgb(12,19,37));
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(24),dp(24),dp(24),dp(28));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int top = insets.getSystemWindowInsetTop(), bottom = insets.getSystemWindowInsetBottom();
            if (Build.VERSION.SDK_INT >= 30) { top = insets.getInsets(WindowInsets.Type.systemBars()).top; bottom = insets.getInsets(WindowInsets.Type.systemBars()).bottom; }
            view.setPadding(dp(24), top+dp(20), dp(24), bottom+dp(24)); return insets;
        });
        scroll.addView(root); setContentView(scroll); root.requestApplyInsets();
        root.addView(text("A LITTLE STARDUST",12,Color.rgb(224,198,140)));
        TextView title=text("Anzuki 星光桌寵",28,Color.rgb(236,241,255)); title.setTypeface(null,Typeface.BOLD);root.addView(title);
        root.addView(text("在手機上，陪你一下。",16,Color.rgb(164,181,208)));
        preview=new ImageView(this);preview.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        root.addView(preview,new LinearLayout.LayoutParams(-1,dp(260)));
        status=text("",14,Color.rgb(164,181,208));root.addView(status);
        Button start=button("啟動懸浮桌寵",Color.rgb(221,196,139),Color.rgb(24,28,39));root.addView(start);
        start.setOnClickListener(v -> {
            if (!Settings.canDrawOverlays(this)) {
                waitingForOverlay=true;
                startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName())));
            } else requestNotificationsAndStart();
        });
        Button stop=button("停止桌寵",Color.rgb(33,47,70),Color.rgb(226,234,250));root.addView(stop);
        stop.setOnClickListener(v -> { stopService(new Intent(this,PetService.class));Toast.makeText(this,"桌寵已停止",Toast.LENGTH_SHORT).show(); });
        root.addView(text("角色大小",16,Color.rgb(226,234,250)));
        SeekBar size=new SeekBar(this);size.setMax(120);size.setProgress(prefs.getInt("size",160)-120);root.addView(size);
        size.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
            public void onStartTrackingTouch(SeekBar b){} public void onProgressChanged(SeekBar b,int p,boolean user){}
            public void onStopTrackingTouch(SeekBar b){prefs.edit().putInt("size",120+b.getProgress()).apply();
                if(PetService.running) { Intent i=new Intent(MainActivity.this,PetService.class);i.setAction(PetService.RESIZE);startService(i); }
            }
        });
        root.addView(text("拖曳移動・點一下彈動・長按回到設定\n也可從持續通知隨時停止桌寵。",14,Color.rgb(164,181,208)));
        try { PetAssets assets=new PetAssets(this);root.addView(text("素材版本 "+assets.index.getString("revision"),11,Color.rgb(119,141,173))); }
        catch(Exception e){Toast.makeText(this,"動畫素材讀取失敗",Toast.LENGTH_LONG).show();}
    }
    @Override protected void onResume(){super.onResume();status.setText(Settings.canDrawOverlays(this)?"懸浮顯示權限已開啟":"首次啟動需允許「顯示在其他應用程式上層」");
        try { PetAssets a=new PetAssets(this);previewDrawable=a.load(a.idle(),true);preview.setImageDrawable(previewDrawable);if(previewDrawable instanceof AnimatedImageDrawable)((AnimatedImageDrawable)previewDrawable).start(); }
        catch(Exception e){status.setText("動畫載入失敗，請重新安裝完整 APK。");}
        if(waitingForOverlay&&Settings.canDrawOverlays(this)){waitingForOverlay=false;requestNotificationsAndStart();}
    }
    @Override protected void onStop(){super.onStop();if(previewDrawable instanceof AnimatedImageDrawable)((AnimatedImageDrawable)previewDrawable).stop();}
    private void requestNotificationsAndStart(){
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},1);
        else startPet();
    }
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code==1)startPet();}
    private void startPet(){
        if(!Settings.canDrawOverlays(this))return;
        try{startForegroundService(new Intent(this,PetService.class));Toast.makeText(this,"桌寵已啟動，可以回到其他 App",Toast.LENGTH_SHORT).show();}
        catch(Exception e){Toast.makeText(this,"無法啟動，請確認系統懸浮窗權限",Toast.LENGTH_LONG).show();}
    }
}
