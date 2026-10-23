# 扶帽子：移除開頭第一陣風

依使用者指定，從原片第 2 秒開始播放：刪除開頭 48 格，保留來源第 48～239 格，共 192 格，720×1280、24 fps，約 8 秒（原始 WebP 時間總和 7,999 ms）。

`adjust-hat.webp` 直接保留原 WebP 的 192 個 ANMF frame chunks，只更新容器長度，沒有解碼後重編碼或改變圖像壓縮。已逐格驗證：每個保留畫格的 RGBA 位元組與原母版對應畫格完全相同，包括透明度。驗證與逐格雜湊見 `manifest.json`。

- [原始 MP4](../animation-v3/original/扶帽子.mp4)
- [剪接前完整 WebP 母版](../animation-v3/full-resolution/adjust-hat.webp)
- [可重現剪接與逐格驗證的腳本](../../scripts/trim-hat-clip.py)

Windows 與 Android 使用位元組相同的剪接結果。此動作仍以 1 倍速播放；本次固定 2 倍速只套用抓起與落地。
