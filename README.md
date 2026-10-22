# Anzuki 桌寵

以你提供的動畫製作的桌面與 Android 懸浮桌寵。平時播放 `loop_long`，點擊時隨機播放從 10 秒影片擷取的兩段原地彈動，播完回到待機。

**美術品質優先：保留原始 720×1280 解析度，使用無損 RGBA 動畫 WebP；桌面和 Android 使用逐位元相同的素材。** 不為了縮小檔案而縮圖、有損轉碼或犧牲色彩細節。去背會改動綠幕及半透明邊緣，角色完全不透明區域保留解碼後的原始 RGB。原始 MP4 原封不動保留。

## Android 手機版

[下載 Android APK](android/releases/Anzuki-Android.apk) · [安裝與使用說明](android/README.md)

Android 9 以上的原生 App，內建素材、離線可用，不需要 Node.js。授予「顯示在其他應用程式上層」後可拖曳、輕點播放彈動、長按回到設定。此版換回完整解析度素材；安裝新版 APK 即可更新。

## 桌面啟動

1. 安裝 [Node.js](https://nodejs.org/) 22.12 以上，建議 24 LTS。
2. GitHub 的 Code → Download ZIP，完整解壓縮。
3. Windows 雙擊 `Start-Windows.cmd`；macOS / Linux 執行 `sh start.sh`。
4. 首次透過 npm 下載 Electron 43.3.0，請保持網路連線並等候。

新版桌面播放器直接顯示無損動畫 WebP，支援透明懸浮、拖曳、點擊彈動。右鍵的「待機動畫」可切換長／短循環；「動畫設定…」提供點擊速度滑條 **1.0×～2.0×、每格 0.1**。設定自動保留，倍速套用於下一次點擊，點擊後返回所選待機，待機維持原速。右鍵也可調整大小、保持最上層、回到右下角及結束；位置保存在本機 `data/desktop/`。這是需要 Node.js 的原始碼啟動版，尚未封裝為獨立 EXE。

`node launch.mjs --check` 或 `--prepare-only` 可離線核對素材是否齊全。`node install.mjs` 也會轉到這個檢查流程；不再把舊版低解析影片安裝成預設素材。

原先參考 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 的 WebM 素材格式。為避免播放器要求的影片格式再次造成 RGBA 細節損失，本版改用本專案的 Electron 圖像播放器。原版 dsh-pet 的甩拋、物理及工作事件整合未移植。

## 動作與預覽

| 用途 | 無損播放檔案 | 原片段 |
| --- | --- | --- |
| 一般待機 | `idle-loop-long.webp` | loop_long 全段，94 幀 |
| 點擊一 | `click-bounce-1.webp` | 10 秒影片第 6–59 幀，54 幀 |
| 點擊二 | `click-bounce-2.webp` | 10 秒影片第 72–127 幀，56 幀 |
| 可選短待機 | `idle-loop-short.webp` | loop_short 全段，60 幀 |

預設仍是長循環。短循環現在也可由桌面選單或 Android 設定選取。來源均為 24 fps，未補幀。WebP 使用毫秒時間戳呈現幀間距。原片腳底幾乎固定，點擊片段為表情、身體與衣髮的原地彈動。

下載後以 Chrome、Edge 或 Firefox 開啟 `preview.html`。可切換背景、點擊角色或使用「原尺寸檢視」檢查細節。桌寵視窗的顯示尺寸可調，素材檔始終保留 720×1280。

- [未修改的三段原始 MP4](materials/animation-v1/original/)
- [新版無損母版與處理說明](materials/animation-v2-lossless/README.md)
- [逐幀像素雜湊及來源紀錄](materials/animation-v2-lossless/manifest.json)
- [桌面與 Android 共用動作索引](pet/animations.json)
- [驗證紀錄](VALIDATION.md)

`animation-v1` 的透明 WebM 和 `pet/anzuki-animation/*.webm` 保留為舊版紀錄，具有有損壓縮或降解析度，已停用。新版播放器及 APK 只使用 `.webp`。

## 同步重製

需要 Python 3、numpy、Pillow、支援 libwebp_anim 的 FFmpeg；建置 Android 另需 Java JDK 17+、Android SDK platform 35 和 build-tools 35.0.0。

```sh
python scripts/update-all.py --sdk /path/to/android-sdk
python scripts/check-platform-sync.py
```

流程從原片重新去背，以無損 RGBA 編碼，逐幀比對解碼像素，再直接複製同一份素材到 Android 並重建 APK。沒有縮圖、沒有重新編碼手機素材。點擊倍速只在記憶體修改 WebP 每幀停留時間，影像與 alpha 壓縮資料保持原樣；不產生降畫質的倍速影片。GitHub Actions 會檢查同步並建置測試 APK。

角色參考版本另見 `materials/argon-reference-v2/`、`v3/`、`v5/`。美術優先與兩平台同步要求已記在 [AGENTS.md](AGENTS.md)。

## 授權與致謝

角色與原始動畫權利仍屬原權利人；本倉庫輔助程式採 MIT。原始桌寵構想與格式參考：[PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)。Electron 由 npm 另行下載，依其授權使用。
