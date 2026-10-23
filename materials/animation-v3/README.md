# 新增拖曳、小憩與日常動畫

來源為使用者在「桌寵」Drive 資料夾上傳的 `桌寵_動畫v1.rar`，以及另外上傳的 `落地_裁切.mp4`。原始封裝、解出的 MP4 與獨立落地影片原樣保留在 [original/](original/)，來源與 SHA-256 見 [source-provenance.json](source-provenance.json)。

| 執行名稱 | 原檔 | 幀數／原速長度 | 用途 |
| --- | --- | --- | --- |
| drag-held | 抓起.mp4 | 240／10 秒 | 拖曳期間循環，放手立即中止 |
| land | 落地_裁切.mp4 | 119／約 4.958 秒 | 拖曳結束後單次播放 |
| nap-start | 小憩_start.mp4 | 240／10 秒 | 小憩進入動作 |
| nap-loop | 小憩_loop.mp4 | 63／2.625 秒 | 小憩持續循環 |
| read-book | 拿書.mp4 | 240／10 秒 | 隨機／手動動作 |
| adjust-hat | 扶帽子.mp4 | 240／10 秒 | 隨機／手動動作 |
| catch-star | 抓星星.mp4 | 240／10 秒 | 隨機／手動動作 |

全片保留原生 **720×1280、24 fps**，不修剪、不縮放、不補幀、不有損重編碼。綠幕處理沿用既有管線，綠色及半透明邊緣會改成 alpha，不透明角色 RGB 保持與原片解碼結果相同。輸出為無損 RGBA 動態 WebP；不帶音軌。原 MP4 的音軌不刪除，但桌寵完全不播放它。

[manifest.json](manifest.json) 記錄每一幀處理後／重新解碼的像素雜湊、原幀數與不透明 RGB 改動數。`full-resolution/`、桌面 `pet/anzuki-animation/` 以及 Android assets 的同名檔案必須逐位元一致。無損壓縮只改儲存方式，不允許減少圖像細節。

重新處理使用 `python scripts/process-new-animations.py`，再執行 `python scripts/sync-android-assets.py` 與 `python scripts/check-platform-sync.py --assets-only`。此步不重製舊 v2 動畫。全部新片段驗證成功後 `manifest.complete` 才會為 true。

操作與計時規則見 [新動畫使用說明](../../ANIMATION-BEHAVIORS.md)。
