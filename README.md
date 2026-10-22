# Anzuki 桌寵

使用你提供的綠幕動畫製作的 dsh-pet 素材包。一般待機採用 `video2_loop_long.mp4`，點擊時隨機播放從 10 秒影片擷取的兩段原地彈動。

桌寵引擎與格式來自原作者：**[PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)**。

## 啟動

1. 安裝 Node.js 22.12 以上版本，建議 24 LTS。
2. 從 GitHub 的 Code → Download ZIP 下載本倉庫並完整解壓縮。
3. Windows 雙擊 `Start-Windows.cmd`；macOS / Linux 在此資料夾執行 `sh start.sh`。
4. 首次啟動會透過 npm 下載 `dsh-pet@0.3.7`，引擎可能另外下載 Electron；保持網路連線並等候。

啟動器使用資料夾內的 `data/` 作為私人設定，不修改既有 DSH 設定。保留終端機視窗，Ctrl+C 結束。這不是免安裝 EXE。

- `node launch.mjs --check`：執行引擎體檢。
- `node launch.mjs --prepare-only`：離線準備素材與私人設定。
- `node install.mjs`：安裝到現有 DSH_HOME（未設定環境變數時使用使用者目錄 `.dsh`）。
- `node install.mjs "D:/MyDSHData"`：指定既有 DSH_HOME。

安裝器只更新 Anzuki 目錄，原本同名素材或設定有變更時會先備份；重啟 DSH 後生效。

## 目前動作

| 用途 | 播放檔案 | 來源 |
| --- | --- | --- |
| 一般待機 | `idle-loop-long.webm` | loop_long 全段，94 幀／24 fps |
| 點擊回應一 | `click-bounce-1.webm` | 10 秒影片的 0.25–2.50 秒 |
| 點擊回應二 | `click-bounce-2.webm` | 10 秒影片的 3.00–5.333 秒 |
| 備用待機 | `idle-loop-short.webm` | loop_short 全段，60 幀／24 fps |

預設隨機動畫池只有長循環待機。短循環保留備用；兩段點擊動畫各自播放後回到待機。沒有混用舊版姿勢圖動畫，沒有新增原片不存在的跳躍。原片腳底幾乎固定，點擊片段主要呈現表情、身體與衣髮的原地彈動。

目前未設定自動行走、轉向或拖曳專屬影片；拖動、甩拋等互動仍由 dsh-pet 引擎提供。餘額、背景碎碎念與工作事件動畫預設關閉。

## 素材與預覽

- [原始素材及處理說明](materials/animation-v1/README.md)
- [未修改的三段原始 MP4](materials/animation-v1/original/)
- [720×1280 高解析透明 WebM](materials/animation-v1/transparent-masters/)
- [640×360 桌寵播放檔案](pet/anzuki-animation/)
- [Anzuki 設定檔](pet/anzuki-config.json)
- [處理參數與精確擷取幀數](materials/animation-v1/manifest.json)
- [驗證紀錄](VALIDATION.md)

下載後用 Chrome、Edge 或 Firefox 開啟 `preview.html`，可比較四段處理後動畫；點擊角色可觸發彈動，播完回到長待機。Safari 的 WebM alpha 支援有限，未提供 HEVC alpha MOV。

## 重製

安裝 Python 3、numpy、scipy，以及包含 libvpx-vp9 的 FFmpeg，執行：

```sh
python scripts/process-videos.py
```

程式讀取倉庫內 `materials/animation-v1/original/` 的三個檔案，重新產生透明母版、桌寵播放檔案與 manifest。使用固定比例及偏移統一角色位置，不會逐幀把動作鎖回腳底，原始的身體起伏會保留。

人物大小可在 `pet/anzuki-config.json` 的 `pets[0].size` 修改。圖片參考版本另見 `materials/argon-reference-v2/`、`v3/`、`v5/`。

## 授權與致謝

參考角色與使用者提供的原始動畫權利仍屬原權利人。本倉庫輔助程式採 MIT；dsh-pet 引擎由 npm 另行下載，依原專案授權使用。

展示或分發此衍生桌寵時，請保留原作者連結：https://github.com/PC2005-cloud/dsh-pet
