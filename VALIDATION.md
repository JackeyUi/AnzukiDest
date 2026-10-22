# 影片素材驗證紀錄

## Android 版本

- Android SDK 35 原生 Java 編譯、D8 dex 轉換、資源連結及 APK 封裝成功。
- APK 已以工作區保留的開發金鑰簽章，Android apksigner 驗證通過；最低 API 28（Android 9），目標 API 35。
- 三段透明動畫 WebP 的幀數為 94、54、56；逐幀檢查透明通道，並核對來源 SHA-256 與桌面影片一致。
- `scripts/check-platform-sync.py` 核對動作設定、素材雜湊、APK 雜湊及 APK 內的實際動畫檔案。
- 沒有網路、相機、麥克風、聯絡人或儲存空間權限；前景服務有持續通知及停止操作。
- 尚未在 Android 實機或模擬器完成拖曳、點擊及跨 App 顯示的互動測試。

## 已完成

- 三段原始 MP4 以逐位元複製保存，SHA-256 記於 `materials/animation-v1/manifest.json`。
- 長待機 94 幀、短待機 60 幀、點擊一 54 幀、點擊二 56 幀；全部維持 24 fps，未補重複幀。
- 四段透明母版與四段桌寵播放版均以 libvpx-vp9 完整解碼並抽取 alpha 驗證。母版 720×1280、播放版 640×360，均含 VP9 alpha，且沒有音軌。
- 透明背景邊界：母版 alpha=0，播放版因有損壓縮可能有 alpha=1 的微小誤差（255 代表完全不透明）。所有片段均有不透明角色區域，未變成全透明或實心背景。
- 已人工檢視白底合成的角色及髮絲／袖套邊緣，確認背景已去除。保留原片生成過程產生的角色細節及微小形變。
- 待機循環接縫的預乘 RGBA 平均絕對差約 2.048，片內相鄰幀中位數約 1.628、最大值約 2.768；接縫差異落在片內正常動作變化範圍，保留使用者提供的完整長循環，不額外混幀。
- 使用原專案的 `src/host/config.ts` 實際執行 `readAllConfig`：新版 Anzuki pets、animations、animationWeights 均被接受，無警告及預設值回落。待機池只有 `idle-loop-long`，點擊池只有兩段新片段。
- `launch.mjs --prepare-only` 成功建立私人設定與素材；安裝器、啟動器與預覽頁 JavaScript 通過語法檢查。

## 驗證範圍

本次驗證涵蓋素材、去背、解碼、幀數與設定載入。未在使用者電腦實測 Electron 桌面視窗；可在本機執行 `node launch.mjs --check` 後啟動。預覽頁已檢查程式語法，未在此環境完成瀏覽器互動測試。

機器可讀的逐檔結果與雜湊見 `materials/animation-v1/validation.json`。

原始 10 秒影片的腳底幾乎固定，點擊動畫為原地彈動，沒有宣稱原片包含明顯離地跳躍。
