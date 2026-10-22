# Android 已簽章版本

請在 [Signed Android release](https://github.com/JackeyUi/AnzukiDest/actions/workflows/release.yml) 最新成功紀錄的 Artifacts，下載 `Anzuki-Android-signed-release` ZIP 並解壓縮取得 APK（需登入 GitHub）。

也可下載完整倉庫後，在電腦執行 `Restore-Android-APK.cmd`，或 `node scripts/restore-android-release.mjs`。程式使用共享無損圖像與 `packaging/` 封裝資料，逐位元還原原簽章 APK；SHA-256 必須符合 `apk-metadata.json`，不需要 Android SDK，不會重編碼圖像。

`archive/` 保留音聲功能加入前的舊版 APK，僅供版本回退。
