package com.jackeyui.anzukipet;

import android.app.Activity;
import android.content.*;
import android.graphics.Color;
import android.os.Bundle;
import android.widget.*;
import org.json.*;

/** A second-level animation menu and independently persisted timers. */
public class BehaviorActivity extends Activity {
    private SharedPreferences prefs;private LinearLayout root;private JSONObject policy;
    private int dp(float n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private TextView text(String s,int size){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(Color.rgb(226,234,250));t.setPadding(0,dp(10),0,dp(10));return t;}
    private void notifyPolicy(){if(PetService.running){Intent i=new Intent(this,PetService.class);i.setAction(PetService.POLICY);startService(i);}}
    private void play(String id){if(!PetService.running){Toast.makeText(this,"請先啟動懸浮桌寵",Toast.LENGTH_SHORT).show();return;}Intent i=new Intent(this,PetService.class);i.setAction(PetService.PLAY);i.putExtra("animation",id);startService(i);}
    private void toggle(String title,String key){CheckBox c=new CheckBox(this);c.setText(title);c.setTextColor(Color.rgb(226,234,250));c.setChecked(prefs.getBoolean(key,true));root.addView(c);c.setOnCheckedChangeListener((v,on)->{prefs.edit().putBoolean(key,on).apply();notifyPolicy();});}
    private void slider(String title,String key){int value=Math.max(5,Math.min(30,prefs.getInt(key,10)));TextView label=text(title+"  "+value+" 分鐘",16);root.addView(label);SeekBar bar=new SeekBar(this);bar.setMax(25);bar.setProgress(value-5);root.addView(bar);
        bar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onStartTrackingTouch(SeekBar b){}public void onProgressChanged(SeekBar b,int n,boolean user){label.setText(title+"  "+(n+5)+" 分鐘");if(user){prefs.edit().putInt(key,n+5).apply();notifyPolicy();}}public void onStopTrackingTouch(SeekBar b){}});
    }
    @Override public void onCreate(Bundle state){super.onCreate(state);prefs=getSharedPreferences("pet",MODE_PRIVATE);
        ScrollView scroll=new ScrollView(this);scroll.setBackgroundColor(Color.rgb(12,19,37));root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(24),dp(32),dp(24),dp(40));scroll.addView(root);setContentView(scroll);
        root.setOnApplyWindowInsetsListener((view,insets)->{view.setPadding(dp(24),insets.getSystemWindowInsetTop()+dp(20),dp(24),insets.getSystemWindowInsetBottom()+dp(24));return insets;});root.requestApplyInsets();
        root.addView(text("動畫選單與自動行為",24));
        try{policy=new PetAssets(this).index.getJSONObject("behavior");}catch(Exception e){root.addView(text("動畫索引讀取失敗",16));return;}
        Button menu=new Button(this);menu.setText("播放動畫 ▸");root.addView(menu);
        menu.setOnClickListener(v->{PopupMenu popup=new PopupMenu(this,menu);android.view.SubMenu sub=popup.getMenu().addSubMenu("播放動畫");JSONArray rows=policy.optJSONArray("manual");if(rows!=null)for(int n=0;n<rows.length();n++){JSONObject item=rows.optJSONObject(n);String id=item.optString("id");sub.add(item.optString("label")).setOnMenuItemClickListener(selected->{play(id);return true;});}popup.getMenu().add("喚醒／回到呼吸").setOnMenuItemClickListener(selected->{play("idle");return true;});popup.show();});
        toggle("未操作桌寵一段時間後自動小憩","nap_enabled");slider("小憩等待時間","nap_minutes");
        root.addView(text("先播放小憩開始，再循環小憩；觸碰或拖曳角色才喚醒。手機以未操作桌寵的時間計算，其他 App 的操作不列入。",14));
        toggle("定時隨機播放其他動作","auto_enabled");slider("隨機動作間隔","action_minutes");
        root.addView(text("每次隨機播放拿書、扶帽子或抓星星其中一個。小憩及拖曳時暫停，動作播完交叉淡回所選呼吸動畫。\n抓起與落地固定 2 倍速，其他動作維持原速。影片原有聲音一律不播放；可在音聲設定為每支動畫加入自己的音檔。",14));
        Button back=new Button(this);back.setText("返回");back.setOnClickListener(v->finish());root.addView(back);
    }
}
