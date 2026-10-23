# Anzuki 桌寵

支援 Windows 與 Android，可拖曳、點擊互動、切換動畫及加入自己的語音。

## 下載與更新

請登入 GitHub，開啟下列頁面的最新成功紀錄，在 Artifacts 下載。

| 平台 | 下載項目 | 使用方式 |
| --- | --- | --- |
| [Windows](https://github.com/JackeyUi/AnzukiDest/actions/workflows/windows.yml) 初次安裝 | `Anzuki-Windows-x64` | 完整解壓，執行 `Anzuki.exe` |
| Windows 更新 | `Anzuki-Windows-Update` | 先結束桌寵，再覆蓋到原本 `Anzuki.exe` 所在資料夾 |
| [Android](https://github.com/JackeyUi/AnzukiDest/actions/workflows/release.yml) | `Anzuki-Android-signed-release` | 解壓後安裝 APK；更新時直接覆蓋安裝 |

Windows 需要 Windows 10／11 64 位元；Android 需要 Android 9 以上。兩者都不需要 Node.js。

Windows 沒有畫面時，先結束桌寵，再執行 `Start-Compatible.cmd`。Android 首次使用請開啟「顯示在其他應用程式上層」。

## 操作

- 點擊角色：播放點擊動畫，連點可重新播放。
- 拖曳角色：抓起；放手後落地並回到待機。
- 拖到螢幕底部放開：收起。Windows 從系統匣、Android 從通知選「顯示桌寵」叫回。
- 開啟設定：Windows 右鍵角色；Android 長按角色或開啟 App。

設定可切換長／短待機、調整點擊速度、播放動作，並設定小憩與隨機動作間隔。詳見 [動畫操作](ANIMATION-BEHAVIORS.md)。

## 語音與自訂動畫

在音聲設定選擇分類或動畫，設定播放日與時段，再按「＋ 加入音檔」。最新加入的語音顯示在最上方。每組最多 12 段、每檔最多 50 MB，僅接受音檔；播放中的聲音不打斷、不排隊。

[75 句錄音稿（日文／繁中）](materials/voice-v1/RECORDING-SCRIPT.md) · [日文純文字](materials/voice-v1/RECORDING-LINES.ja.txt) · [錄音稿 ZIP](materials/voice-v3/Anzuki-Voice-Scripts-75.zip)

「自訂動畫」可加入透明動態 WebP，分別用於待機或點擊。詳見 [加入方式與限制](CUSTOM-ANIMATIONS.md)。

個人設定、錄音及匯入動畫會保留，不會隨程式更新覆蓋或自動上傳。

## 素材與開發

內建動畫保留原始 720×1280、24 fps，以無損 RGBA 播放。Windows 與 Android 使用相同素材。

[原片、修復母版與比較圖](materials/animation-v5-hair-cleanup/) · [驗證紀錄](VALIDATION.md) · [開發規則](AGENTS.md) · [Android 說明](android/README.md)

開發啟動：安裝 Node.js 24，執行 `node launch.mjs`。Android 建置：執行 `python android/build.py --sdk /path/to/android-sdk`，需要 JDK 17+、Python 3 與 Android SDK 35。

角色與原始動畫權利屬原權利人，輔助程式採 MIT。桌寵構想參考 [dsh-pet](https://github.com/PC2005-cloud/dsh-pet)。
