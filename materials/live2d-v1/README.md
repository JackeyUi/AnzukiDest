# Anzuki Live2D 素材入口

本目錄目前只有交付規格與模板，**沒有已完成的 Anzuki Live2D 模型**。原版影片／WebP 都保留原位置，不移動、不覆蓋。

先讀 [美術與建模交付規格](ART-BRIEF.zh-TW.md)。如果只有一張合成 PNG，先放 `reference/`；仍需要拆圖、補畫與綁定。若已找建模師，直接提供此文件和交付規格即可。

## 放什麼、怎麼放

| 目錄 | 用途 | 上傳入口 |
| --- | --- | --- |
| [reference/](reference/) | 定稿全身圖、眼睛／星飾／袖套／鞋等局部、動作示意 | [Upload files](https://github.com/JackeyUi/AnzukiDest/upload/experiment/live2d-interaction/materials/live2d-v1/reference) |
| [layers/](layers/) | 原尺寸分層 PSD；可另附同畫布透明 PNG 圖層 | [Upload files](https://github.com/JackeyUi/AnzukiDest/upload/experiment/live2d-interaction/materials/live2d-v1/layers) |
| [project/](project/) | 可編輯 `.cmo3`／`.can3` 及所需工程附件 | [Upload files](https://github.com/JackeyUi/AnzukiDest/upload/experiment/live2d-interaction/materials/live2d-v1/project) |
| [runtime/](runtime/) | 完整 `.model3.json`、`.moc3`、PNG 貼圖、動作、表情、物理等 | [Upload files](https://github.com/JackeyUi/AnzukiDest/upload/experiment/live2d-interaction/materials/live2d-v1/runtime) |
| [review/](review/) | 錄製的模型檢查影片、截圖、問題表 | [Upload files](https://github.com/JackeyUi/AnzukiDest/upload/experiment/live2d-interaction/materials/live2d-v1/review) |

確認分支為 `experiment/live2d-interaction`，按 **Add file → Upload files**，拖入檔案／資料夾，保留層級。模型包先解開再放進 `runtime/anzuki/`，不能只交 `.moc3` 或只交一段展示影片。網頁單檔上限 25 MiB；大檔改用 Git、另行設定 Git LFS，或 GitHub Release 附件並記錄位置／SHA-256。不要壓低品質來遷就上傳限制。

每次新稿使用版本子目錄，並建立 `delivery.json`（可複製 [delivery.example.json](delivery.example.json)）列出定稿、尺寸、作者、Editor／匯出版本、權利和檔案雜湊。檔名大小寫與模型內引用須一致，避免 Windows 可讀而 Android 失敗。

這個入口是 **GitHub 素材交付位置**。現有 App 的自訂動畫匯入仍只接受透明動態 WebP；Live2D 匯入與播放尚待開發。個人在 App 匯入的錄音／動畫不會自動上傳到這裡。Google Drive 不上傳。

## 最小交付清單

- [ ] 一張確認過造型的原生高解析定稿，另附局部特寫；不以插值放大當作新增細節。
- [ ] 完整分層 PSD，眼白／瞳孔／高光／眼皮、前後髮、臉、手臂／袖套、披肩、腿鞋分開，補齊遮住的位置。
- [ ] 可編輯 Cubism 模型 `.cmo3`，以及所用 Editor 版本；有時間軸動作時附 `.can3`。
- [ ] 可載入的完整 runtime 包：`.model3.json` 引用的全部檔案均存在、路徑正確。
- [ ] 眼球 XY、左右眼開合、呼吸；頭部 XY 建議一併完成；附參數 ID／範圍與正負方向。
- [ ] 頭、臉、手的隨動命中區域與至少三種不同回應；左右分區與披肩／鞋可在後續擴充。
- [ ] 待機與點擊動作、表情與物理檔；說明各動作是否接管眼球／眼皮／頭部參數。
- [ ] 追視極限、閉眼、不同部位、快速連點切換、髮衣物理的檢查資料。
- [ ] 角色、原稿、模型工程可用於 Windows／Android 桌寵、公開倉庫與後續修改的權利說明。

[interaction-plan.json](interaction-plan.json) 是程式與建模師共用的**設計草案**；其中 `null` 表示尚未取得的實際綁定。它不是 `.model3.json`，也不會讓舊 App 自動啟用 Live2D。收到模型後再校準 ID、命中優先權和參數方向。
