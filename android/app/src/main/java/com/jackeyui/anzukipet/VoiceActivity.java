package com.jackeyui.anzukipet;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.widget.*;
import android.view.*;
import android.net.Uri;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;

public class VoiceActivity extends Activity {
    private VoiceStore store;private PetVoicePlayer preview;private TextView status;private ScrollView scroll;
    private String pendingEvent,pendingLine;private boolean importing;private static final int PICK_AUDIO=41;
    private int dp(float n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private TextView text(String s,int size){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(Color.rgb(226,234,250));t.setPadding(0,dp(9),0,dp(6));return t;}
    private Button button(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);return b;}
    private void report(String message){if(status!=null)status.setText(message);}
    @Override public void onCreate(Bundle state){super.onCreate(state);if(state!=null){pendingEvent=state.getString("voiceEvent");pendingLine=state.getString("voiceLine");}try{store=new VoiceStore(this);preview=new PetVoicePlayer(this,this::report);build();}catch(Exception e){Toast.makeText(this,"音聲設定讀取失敗",Toast.LENGTH_LONG).show();finish();}}
    private void notifyPlayer(){preview.apply();if(PetService.running){Intent i=new Intent(this,PetService.class);i.setAction(PetService.VOICE_UPDATE);startService(i);}}
    private void test(String event,String id){
        if(PetService.running){preview.stop();Intent i=new Intent(this,PetService.class);i.setAction(PetService.VOICE_TEST);i.putExtra("event",event);i.putExtra("clipId",id);startService(i);report("試聽已送出；依目前音量播放。");}
        else preview.play(event,id,true);
    }
    private void stopVoice(){preview.stop();if(PetService.running){Intent i=new Intent(this,PetService.class);i.setAction(PetService.VOICE_STOP);startService(i);}report("已停止播放");}
    private void build() throws Exception {
        final int oldY=scroll==null?0:scroll.getScrollY();scroll=new ScrollView(this);scroll.setBackgroundColor(Color.rgb(12,19,37));LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(22),dp(30),dp(22),dp(35));scroll.addView(root);setContentView(scroll);
        root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(dp(22),dp(20)+insets.getSystemWindowInsetTop(),dp(25),dp(25)+insets.getSystemWindowInsetBottom());return insets;});root.requestApplyInsets();
        root.addView(text("Anzuki 音聲設定",25));root.addView(text("依本機時間與星期選台詞。\n匯入你的錄音；不重編碼，也不跟著動畫變速。",14));
        root.addView(text("現在："+new SimpleDateFormat("EEEE HH:mm",Locale.TRADITIONAL_CHINESE).format(new Date()),14));
        Switch muted=new Switch(this);muted.setText("靜音");muted.setTextColor(Color.WHITE);muted.setChecked(store.muted());root.addView(muted);muted.setOnCheckedChangeListener((v,value)->{store.prefs.edit().putBoolean("muted",value).apply();notifyPlayer();});
        TextView volumeLabel=text("音聲音量  "+store.volume()+"%",16);root.addView(volumeLabel);SeekBar volume=new SeekBar(this);volume.setMax(100);volume.setProgress(store.volume());root.addView(volume);volume.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onStartTrackingTouch(SeekBar b){}public void onStopTrackingTouch(SeekBar b){}public void onProgressChanged(SeekBar b,int p,boolean user){volumeLabel.setText("音聲音量  "+p+"%");if(user){store.prefs.edit().putInt("volume",p).apply();notifyPlayer();}}});
        Switch automatic=new Switch(this);automatic.setText("待機時自動閒聊");automatic.setTextColor(Color.WHITE);automatic.setChecked(store.idleEnabled());root.addView(automatic);
        TextView intervalLabel=text("閒聊間隔  "+store.idleMinutes()+" 分鐘",16);root.addView(intervalLabel);SeekBar interval=new SeekBar(this);interval.setMax(9);interval.setProgress(store.idleMinutes()-1);interval.setEnabled(store.idleEnabled());root.addView(interval);
        automatic.setOnCheckedChangeListener((v,value)->{store.prefs.edit().putBoolean("idleEnabled",value).apply();interval.setEnabled(value);notifyPlayer();});
        interval.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onStartTrackingTouch(SeekBar b){}public void onProgressChanged(SeekBar b,int p,boolean user){intervalLabel.setText("閒聊間隔  "+(p+1)+" 分鐘");}public void onStopTrackingTouch(SeekBar b){store.prefs.edit().putInt("idleMinutes",b.getProgress()+1).apply();notifyPlayer();}});
        root.addView(text("連點有冷卻、不疊音。自動播放避開其他媒體與系統靜音；沒有當前時段適用的音檔時保持安靜。試聽可手動播放任一句。",13));
        status=text("尚未錄製的台詞可之後再匯入。",14);root.addView(status);Button stop=button("停止播放");root.addView(stop);stop.setOnClickListener(v->stopVoice());
        JSONArray events=store.policy.getJSONArray("events");
        for(int e=0;e<events.length();e++){
            JSONObject item=events.getJSONObject(e);final String event=item.getString("id");root.addView(text(item.getString("label"),20));
            List<String> ids=new ArrayList<>(),labels=new ArrayList<>();ids.add("");labels.add("依音檔檔名辨識台詞");JSONArray all=store.catalog.getJSONArray("lines");
            for(int n=0;n<all.length();n++){JSONObject line=all.getJSONObject(n);if(event.equals(line.getString("event"))){ids.add(line.getString("id"));labels.add(line.getString("label")+"："+line.getString("text"));}}
            ids.add("generic");labels.add("通用（不限時間與星期）");Spinner assignment=new Spinner(this);
            ArrayAdapter<String> adapter=new ArrayAdapter<String>(this,android.R.layout.simple_spinner_item,labels){private View style(View v){((TextView)v).setTextColor(Color.WHITE);v.setBackgroundColor(Color.rgb(33,47,70));v.setPadding(dp(9),dp(12),dp(9),dp(12));return v;}@Override public View getView(int p,View v,ViewGroup parent){return style(super.getView(p,v,parent));}@Override public View getDropDownView(int p,View v,ViewGroup parent){return style(super.getDropDownView(p,v,parent));}};
            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);assignment.setAdapter(adapter);root.addView(assignment);
            Button add=button("匯入音檔");root.addView(add);add.setOnClickListener(v->{if(importing)return;pendingEvent=event;pendingLine=ids.get(assignment.getSelectedItemPosition());Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("audio/*");intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);startActivityForResult(intent,PICK_AUDIO);});
            JSONArray clips=store.clips(event);if(clips.length()==0)root.addView(text("尚未匯入音檔",13));
            for(int n=0;n<clips.length();n++){
                JSONObject clip=clips.getJSONObject(n);final String id=clip.getString("id");JSONObject line=store.line(clip.getString("lineId"));root.addView(text(clip.getString("name")+" · "+(line==null?"通用":line.getString("label")),14));
                LinearLayout row=new LinearLayout(this);Button test=button("試聽"),remove=button("移除");row.addView(test,new LinearLayout.LayoutParams(0,dp(48),1));row.addView(remove,new LinearLayout.LayoutParams(0,dp(48),1));root.addView(row);
                test.setOnClickListener(v->test(event,id));remove.setOnClickListener(v->{try{preview.stop();store.remove(id);notifyPlayer();build();}catch(Exception ex){report("移除失敗");}});
            }
        }
        root.addView(text("支援 WAV、MP3、OGG、M4A、FLAC、AAC；每檔最多 50 MB。匯入後複製到 App 私有空間，原檔不動，也不會自動上傳。",13));scroll.post(()->scroll.scrollTo(0,oldY));
    }
    @Override protected void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);out.putString("voiceEvent",pendingEvent);out.putString("voiceLine",pendingLine);}
    @Override protected void onRestoreInstanceState(Bundle state){super.onRestoreInstanceState(state);pendingEvent=state.getString("voiceEvent");pendingLine=state.getString("voiceLine");}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request!=PICK_AUDIO||result!=RESULT_OK||data==null||pendingEvent==null)return;
        List<Uri> files=new ArrayList<>();if(data.getClipData()!=null)for(int i=0;i<data.getClipData().getItemCount();i++)files.add(data.getClipData().getItemAt(i).getUri());else if(data.getData()!=null)files.add(data.getData());
        final String event=pendingEvent,assignment=pendingLine==null?"":pendingLine;importing=true;report("正在原樣複製音檔……");
        new Thread(()->{int count=0;List<String> errors=new ArrayList<>();for(Uri uri:files)try{store.importFile(event,assignment,uri);count++;}catch(Exception e){errors.add(e.getMessage());}
            final int imported=count;runOnUiThread(()->{importing=false;if(isFinishing()||isDestroyed())return;try{notifyPlayer();build();report("已匯入 "+imported+" 段"+(errors.isEmpty()?"":"；"+errors.get(0)));}catch(Exception e){report("音檔清單更新失敗");}});
        },"Anzuki-audio-import").start();
    }
    @Override protected void onStop(){super.onStop();if(preview!=null)preview.stop();}
    @Override protected void onDestroy(){if(preview!=null)preview.close();super.onDestroy();}
}
