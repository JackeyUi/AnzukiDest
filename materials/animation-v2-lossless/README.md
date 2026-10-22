# 原始尺寸無損動畫 v2

美術優先。從 `../animation-v1/original/` 原始 MP4 重新解碼、去背，全程不縮圖。輸出保留 720×1280，以 lossless RGBA 動畫 WebP 儲存，避免去背後的 RGB 再經 YUV 色度抽樣。

`full-resolution/` 四段檔案與 `../../pet/anzuki-animation/` 對應 WebP 完全相同；長／短待機及兩段點擊也以相同位元複製到 Android。預設長循環，短循環可在兩平台設定選取。

去背只處理綠幕與半透明邊緣；角色完全不透明區域的 RGB 與原始解碼畫面相同。保留原片已有的生成細節與形變，沒有新增動作、補幀或銳化。

編碼使用 FFmpeg `libwebp_anim -lossless 1 -quality 100 -compression_level 0 -pix_fmt bgra`。compression_level 決定無損壓縮運算量，不代表畫質降低。每段編碼後使用 Pillow 解碼，對每一幀比對去背後 RGBA 的 SHA-256，必須完全相同才通過；alpha=0 底下不可見的 RGB 正規化為 0 後比較。

`manifest.json` 記錄原片 SHA-256、擷取幀界、每幀像素雜湊、輸出雜湊及不透明區域改色數（必須為 0）。94、60、54、56 幀全部保留，來源 24 fps；WebP 以整數毫秒表示每幀時間。

重製：`python scripts/process-videos.py`。同步並建置兩平台：`python scripts/update-all.py --sdk /path/to/android-sdk`。

舊版 WebM 因有損編碼、桌面縮圖而造成畫質損失，僅保留歷史紀錄，已不作為新版播放器或 APK 的輸入。
