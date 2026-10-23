# Anzuki Android 桌寵

支援 Android 9 以上，安裝後可離線使用。

## 安裝與更新

1. 登入 GitHub，開啟 [Signed Android release](https://github.com/JackeyUi/AnzukiDest/actions/workflows/release.yml) 最新成功紀錄。
2. 在 Artifacts 下載 `Anzuki-Android-signed-release`，解壓後於手機安裝 APK。
3. 開啟 App，按「啟動／顯示懸浮桌寵」，允許「顯示在其他應用程式上層」。

更新時直接安裝新版 APK，保留個人設定與錄音。請使用 signed-release，不要安裝測試 APK。

## 操作

- 點擊互動、拖曳移動、長按開啟設定。
- 拖到螢幕底部放開可收起；從通知選「顯示桌寵」叫回。
- App 可切換待機、調整速度與大小，並手動播放動畫。
- 「動畫選單與自動行為」可設定小憩和隨機動作間隔，範圍皆為 5～30 分鐘。
- 小憩以未操作桌寵的時間計算；點擊或拖曳角色喚醒。
- 從 App 或通知按「停止」可結束桌寵。

## 語音與動畫

「音聲設定與試聽」可加入音檔，設定播放日、時段及各動畫配音。最新加入的語音置頂，每檔最多 50 MB、每組最多 12 段。播放中的聲音不打斷、不排隊。

[75 句錄音稿](../materials/voice-v1/RECORDING-SCRIPT.md) · [自訂動畫](../CUSTOM-ANIMATIONS.md) · [完整操作](../ANIMATION-BEHAVIORS.md)

Android 9～12 的透明區域可能攔住底下 App 的觸控；Android 13+ 支援透明背景點穿。

## 開發

需要 JDK 17+、Python 3 與 Android SDK 35：

```sh
python android/build.py --sdk /path/to/android-sdk
```

發行時沿用 `.local/android-signing/` 的簽章金鑰；請勿提交金鑰。兩平台使用相同的 720×1280 無損動畫。
