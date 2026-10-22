# Anzuki Android 懸浮桌寵

原生 Android App，可顯示在其他 App 上方；最低 Android 9（API 28），針對 Android 15（API 35）建置。動畫內建，安裝後可離線使用，不需要 Node.js。

## 安裝

1. 開啟 [Signed Android release](https://github.com/JackeyUi/AnzukiDest/actions/workflows/release.yml)，進入最新成功紀錄，於 Artifacts 下載 `Anzuki-Android-signed-release`，解壓縮取得 APK（需登入 GitHub）。也可下載完整倉庫 ZIP，在電腦執行 `Restore-Android-APK.cmd`，或 `node scripts/restore-android-release.mjs`，產生同一份原簽章 APK，不需要 Android SDK。
2. 在手機的檔案管理員開啟 APK，依系統要求允許這個來源安裝應用程式。
3. 開啟「Anzuki 桌寵」，按「啟動懸浮桌寵」。
4. 首次使用會進入系統設定，開啟「顯示在其他應用程式上層」後回到 App。Android 13 以上也會詢問通知權限，以便從通知停止桌寵。

這是開發簽章的側載 APK，未經 Google Play 上架。首次發行已驗證編譯、簽章、封裝與素材同步，尚未在實體手機或模擬器完成互動實測。部分品牌的背景限制、遊戲或敏感系統畫面可能限制懸浮窗。

## 使用

- 設定中的「待機動畫」可選長循環 `idle-loop-long` 或短循環 `idle-loop-short`，預設長循環。
- 「點擊動畫速度」滑條提供 1.0×～2.0×，每格 0.1。只加速點擊動作，待機維持原速；自動記住設定。
- 可點設定畫面上方角色，直接預覽所選點擊倍速。
- 輕點角色，隨機播放一段點擊彈動；播完回到選定的長／短待機。
- 拖曳移動；位置與大小保存在手機本機。
- 長按角色回到設定。
- 在設定或持續通知按「停止」，結束動畫與懸浮服務。
- 不會在開機後自行啟動，不會自動安裝新版 APK。

App 只有懸浮顯示、前景服務及通知相關權限，沒有網路、相機、麥克風、聯絡人或檔案讀取權限。

## 音聲

在主設定按「音聲設定與試聽」，為啟動招呼、點擊回應、待機閒聊匯入自己的錄音。可匯入裝置能解碼的錄音及影片聲音；匯入原樣複製到 App 私有空間，不需儲存空間權限、不重新編碼、不自動上傳。

[14 句參考文本](../materials/voice-v1/RECORDING-SCRIPT.md) 分平日／假日及時段。檔名自由，匯入前選擇每天／平日／假日及時段，每段之後可修改條件。平日為週一至週五，假日為週六、週日；不自動判斷國定假日。手動播放不受時段限制，自動播放依本機時間選擇，沒有適用檔案就保持安靜。影片僅播放聲音，無音軌或無法解碼的檔案會拒絕匯入。這版尚未附正式角色音檔。

提供音量、靜音、停止播放、移除及 1–10 分鐘自動閒聊間隔。待機閒聊預設關閉；點擊音聲有冷卻、不疊音，播放速度獨立於動畫。自動播放避開其他媒體與系統靜音；耳機與媒體音量沿用 Android 系統設定。

## 與桌面版同步

桌面版的 `../pet/anzuki-config.json` 是動作名稱與點擊池的唯一設定來源。`../scripts/sync-android-assets.py` 直接複製桌面使用的 720×1280 無損 RGBA 動畫 WebP，不縮圖、不裁切、不重新編碼。兩平台內建四段動畫，檔案 SHA-256 相同，保留原始動作與相對位置。去背後的各幀已通過逐像素無損驗證；角色完全不透明區域保留原色。

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

需要 Java JDK 17 以上、Python 3、numpy、Pillow、FFmpeg，以及 Android SDK platform 35 與 build-tools 35.0.0。此純 Java 專案直接使用 Android 原生工具建置，不需要 Gradle 或 Android Studio。建置腳本目前用於 Linux／GitHub Actions，Windows 使用者直接下載 APK 即可。

GitHub Actions 會在 Android、桌面素材或相關腳本更新時檢查同步並建置測試 APK。供你安裝的 `Anzuki-Android-signed-release` 沿用原簽章；`Android + desktop sync` 的測試產物使用臨時開發簽章，不一定能覆蓋已安裝的版本。舊 APK 另存於 `releases/archive/`，不要拿來測試這次音聲功能。

開發簽章金鑰只保存在建置工作區 `.local/android-signing/`，不會上傳 GitHub。之後發行更新應保留同一把金鑰；若換了簽章，需要移除舊 App 再安裝。後續處理此專案時，會一起更新桌面素材、手機素材與 APK。

早期桌面格式參考：[PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)。Android 原生懸浮顯示程式為本專案實作。
