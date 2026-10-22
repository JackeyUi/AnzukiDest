package com.jackeyui.anzukipet;
import android.app.Activity;
import android.content.*;
import android.graphics.Color;
import android.os.Bundle;
import android.widget.*;
import org.json.*;
public class AnimationActivity extends Activity {
    private AnimationStore store;private String pendingRole="idle";private TextView status;private boolean importing;
    private TextView text(String value){TextView t=new TextView(this);t.setText(value);t.setTextSize(16);t.setTextColor(Color.rgb(226,234,250));t.setPadding(0,20,0,12);return t;}
    private Button button(String value){Button b=new Button(this);b.setText(value);return b;}
    @Override public void onCreate(Bundle state){super.onCreate(state);if(state!=null)pendingRole=state.getString("role","idle");store=new AnimationStore(this);try{build();}catch(Exception e){finish();}}
    private void notifyPet(){if(PetService.running){Intent i=new Intent(this,PetService.class);i.setAction(PetService.UPDATE);startService(i);}}
    private void build() throws Exception{ScrollView scroll=new ScrollView(this);scroll.setBackgroundColor(Color.rgb(12,19,37));LinearLayout root=new LinearLayout(this);root.setOrientation(1);int padding=Math.round(24*getResources().getDisplayMetrics().density);root.setPadding(padding,padding*2,padding,padding*2);scroll.addView(root);setContentView(scroll);
        root.addView(text("自訂動畫"));root.addView(text("加入透明背景的動態 WebP，可作為待機或點擊動畫。原尺寸、原幀率保存，不轉檔、不壓縮。每檔 100 MB、最多 10 段。"));
        status=text("");root.addView(status);for(String role:new String[]{"idle","click"}){Button add=button(role.equals("idle")?"加入待機動畫":"加入點擊動畫");root.addView(add);add.setOnClickListener(v->{if(importing)return;pendingRole=role;Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("image/webp");startActivityForResult(i,51);});}
        Button reset=button("切回內建動畫");root.addView(reset);reset.setOnClickListener(v->{getSharedPreferences("pet",MODE_PRIVATE).edit().putString("selected_idle","idle-loop-long").putString("click_animation","builtin").apply();notifyPet();status.setText("已切回內建動畫");});
        JSONArray items=store.items();for(int n=0;n<items.length();n++){JSONObject row=items.getJSONObject(n);String id=row.getString("id"),role=row.getString("role");root.addView(text(row.getString("label")+" · "+(role.equals("idle")?"待機":"點擊")+" · "+row.getInt("width")+"×"+row.getInt("height")+" · "+row.getInt("frames")+" 幀"));
            Button use=button("套用"),remove=button("移除");root.addView(use);root.addView(remove);use.setOnClickListener(v->{getSharedPreferences("pet",MODE_PRIVATE).edit().putString(role.equals("idle")?"selected_idle":"click_animation",id).apply();notifyPet();status.setText("已套用動畫");});
            remove.setOnClickListener(v->{try{store.remove(id);notifyPet();build();}catch(Exception e){status.setText("移除失敗");}});
        }
        root.addView(text("匯入後自動套用。移除自訂動畫會退回內建。若背景是白色或綠色，請先完成去背並匯出帶透明度的動態 WebP；直接改副檔名無法使用。"));
    }
    @Override protected void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);out.putString("role",pendingRole);}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request!=51||result!=RESULT_OK||data==null||data.getData()==null)return;final android.net.Uri uri=data.getData();final String role=pendingRole;importing=true;status.setText("正在原樣複製與檢查動畫……");new Thread(()->{try{JSONObject item=store.importFile(uri,role);getSharedPreferences("pet",MODE_PRIVATE).edit().putString(role.equals("idle")?"selected_idle":"click_animation",item.getString("id")).apply();runOnUiThread(()->{importing=false;notifyPet();try{build();status.setText("已原樣匯入並套用");}catch(Exception e){}});}catch(Exception e){runOnUiThread(()->{importing=false;status.setText(e.getMessage());});}},"Anzuki-animation-import").start();}
}
