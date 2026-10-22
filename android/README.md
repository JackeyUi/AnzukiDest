# Anzuki Android 懸浮桌寵

原生 Android App，可顯示在其他 App 上方；最低 Android 9（API 28），針對 Android 15（API 35）建置。動畫內建，安裝後可離線使用，不需要 Node.js。

## 安裝

1. 下載 [`releases/Anzuki-Android.apk`](releases/Anzuki-Android.apk)。
2. 在手機的檔案管理員開啟 APK，依系統要求允許這個來源安裝應用程式。
3. 開啟「Anzuki 桌寵」，按「啟動懸浮桌寵」。
4. 首次使用會進入系統設定，開啟「顯示在其他應用程式上層」後回到 App。Android 13 以上也會詢問通知權限，以便從通知停止桌寵。

這是開發簽章的側載 APK，未經 Google Play 上架。首次發行已驗證編譯、簽章、封裝與素材同步，尚未在實體手機或模擬器完成互動實測。部分品牌的背景限制、遊戲或敏感系統畫面可能限制懸浮窗。

## 使用

- 平常播放與桌面版相同的 `idle-loop-long`。
- 輕點角色，隨機播放一段點擊彈動；播完回到待機。
- 拖曳移動；位置與大小保存在手機本機。
- 長按角色回到設定。
- 在設定或持續通知按「停止」，結束動畫與懸浮服務。
- 不會在開機後自行啟動，不會自動安裝新版 APK。

App 只有懸浮顯示、前景服務及通知相關權限，沒有網路、相機、麥克風、聯絡人或檔案讀取權限。

## 與桌面版同步

桌面版的 `../pet/anzuki-config.json` 是動作名稱與點擊池的唯一設定來源。`../scripts/sync-android-assets.py` 從同一批桌面 WebM 產生帶 alpha 的動畫 WebP，統一裁切安全邊界，保留 24 fps 與動作相對位置。

`animations.json` 記錄來源 SHA-256、幀數及素材版本。`check-platform-sync.py` 核對桌面設定、手機動畫與 APK 內實際封裝的內容，避免兩版各用不同素材。

更新原始影片後，可一次處理兩個平台：

```sh
python scripts/update-all.py --sdk /path/to/android-sdk
```

只更新手機版：

```sh
python android/build.py --sdk /path/to/android-sdk
python scripts/check-platform-sync.py
```

需要 Java JDK 17 以上、Python 3、numpy、scipy、FFmpeg，以及 Android SDK platform 35 與 build-tools 35.0.0。此純 Java 專案直接使用 Android 原生工具建置，不需要 Gradle 或 Android Studio。建置腳本目前用於 Linux／GitHub Actions，Windows 使用者直接下載 APK 即可。

GitHub Actions 會在 Android、桌面素材或相關腳本更新時檢查同步並建置測試 APK。正式提供給你下載的檔案位於 `android/releases/`；Actions 的測試產物使用臨時開發簽章，不一定能覆蓋已安裝的版本。

開發簽章金鑰只保存在建置工作區 `.local/android-signing/`，不會上傳 GitHub。之後發行更新應保留同一把金鑰；若換了簽章，需要移除舊 App 再安裝。後續處理此專案時，會一起更新桌面素材、手機素材與 APK。

桌面引擎與素材格式參考：[PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)。Android 原生懸浮顯示程式為本專案實作。
