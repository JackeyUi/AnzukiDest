# 無損素材與同步驗證

## 本次修正

舊版把直式原片縮到 158×280，再放進 640×360 畫布；Android 又從該縮小影片產生動畫，並且 WebM 曾經使用有損編碼。這些處理造成細節損失，已停止使用。

新版直接讀取三段原始 MP4，去背後保留 720×1280，輸出無損 RGBA 動畫 WebP。桌面改用 Electron 圖像播放器，Android 使用原生 AnimatedImageDrawable；兩平台素材逐位元相同。視窗顯示尺寸與素材解析度分開處理。

## 已通過的檢查

- 原始 MP4 的 SHA-256 與舊版原始上傳紀錄一致，沒有覆寫或重新壓縮原檔。
- 四段動畫為 94、60、54、56 幀，共 264 幀；保留原始 720×1280，來源 24 fps，不補幀。WebP 每幀時間使用整數毫秒。
- 全部 264 幀編碼後重新解碼，對照去背後 RGBA SHA-256 完全相同。alpha=0 下的不可見 RGB 正規化為 0。逐幀雜湊記於 `materials/animation-v2-lossless/manifest.json`。
- 去背中完全不透明區域的原始 RGB 改色數為 0。綠幕及半透明邊緣必須經過去背與綠色溢色處理，並非原片與去背圖的所有像素都相同。
- 母版、桌面預設素材、Android 素材的完整檔案雜湊相同；APK 內封裝的三段素材也與桌面逐位元相同。
- Chromium 預覽檢查：實際解碼尺寸 720×1280、點擊播放、結束返回長待機、720×1280 原尺寸檢視均通過。
- Chromium 中載入桌面 renderer 並模擬 Electron IPC：720×1280 解碼、點擊、返回待機、拖曳與右鍵選單事件連線通過，未發生 JavaScript 錯誤。此項透過本機 HTTP 提供相同檔案；受環境瀏覽器政策限制，未以 file URL 測試。
- 桌面主程序、preload、renderer、預覽與啟動程式通過語法檢查；`node launch.mjs --check` 通過。
- Android 原生 Java 編譯、D8、資源連結及 APK 封裝通過；apksigner 驗證通過，沿用既有簽章憑證，因此新版可覆蓋舊版。
- `scripts/check-platform-sync.py` 驗證母版、桌面、Android、動作設定、素材索引、APK SHA-256 與 APK 實際封裝內容一致。

本版素材版本：`8551fcf022ba14da`。APK 大小與 SHA-256 見 `android/releases/apk-metadata.json`。

## 尚未實測的範圍

未在使用者 Windows / macOS 桌面實測 Electron 原生透明視窗、跨視窗拖曳及多螢幕行為。未在 Android 實機或模擬器實測懸浮窗、拖曳、點擊與各品牌背景限制；編譯和簽章驗證不能代替這些互動測試。

保留原片生成時已有的形變與細節；不宣稱去背會提升原片本身的畫質。點擊動畫為原地彈動，沒有新增原片不存在的跳躍。
