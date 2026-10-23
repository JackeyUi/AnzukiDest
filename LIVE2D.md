# Anzuki 互動模型實驗入口

目前進度：**完成調查與素材規格，尚未整合 Live2D 播放器，也尚未收到 Anzuki 的分層立繪或綁定模型。** 這個分支中的現有 EXE／APK 仍使用原版 WebP 動畫。

- 實驗分支：[`experiment/live2d-interaction`](https://github.com/JackeyUi/AnzukiDest/tree/experiment/live2d-interaction)
- 原版備份：[`archive/webp-stable-2026-10-23`](https://github.com/JackeyUi/AnzukiDest/tree/archive/webp-stable-2026-10-23)，固定在 `a0fac76b8d04de0c9e7730335f66774096a4655a`。
- [詳細調查與實作建議](docs/live2d/RESEARCH.zh-TW.md)
- [素材入口與上傳方法](materials/live2d-v1/README.md)
- [給繪師／Live2D 建模師的交付規格](materials/live2d-v1/ART-BRIEF.zh-TW.md)
- [第一階段互動規劃](materials/live2d-v1/interaction-plan.json)

第一階段目標是：待機時眼睛追隨鼠標；點頭部、臉頰、手、披肩、鞋子時有不同回應；透明背景繼續點穿；連點立即重播動作；聲音照原有規則播完、不打斷、不排隊。部位與動作清單是可調整的初稿。

建議採 **Live2D Cubism 模型**，在現有 Windows Electron 與 Android 原生程式各加入播放器。兩平台共用同一套模型、貼圖、動作與互動設定；Android 沒有鼠標時改成角色範圍內的觸控追視，放開後自然回正。

## 素材上傳

| 你目前有的檔案 | 放置位置 | GitHub 網頁入口 |
| --- | --- | --- |
| 定稿參考圖、局部特寫、動作示意 | `materials/live2d-v1/reference/` | [上傳參考圖](https://github.com/JackeyUi/AnzukiDest/upload/experiment/live2d-interaction/materials/live2d-v1/reference) |
| 分層 PSD、同尺寸透明 PNG 圖層 | `materials/live2d-v1/layers/` | [上傳分層原稿](https://github.com/JackeyUi/AnzukiDest/upload/experiment/live2d-interaction/materials/live2d-v1/layers) |
| Cubism 可編輯模型／動畫工程 | `materials/live2d-v1/project/` | [上傳工程](https://github.com/JackeyUi/AnzukiDest/upload/experiment/live2d-interaction/materials/live2d-v1/project) |
| 完整匯出模型及其引用檔案 | `materials/live2d-v1/runtime/` | [上傳模型包](https://github.com/JackeyUi/AnzukiDest/upload/experiment/live2d-interaction/materials/live2d-v1/runtime) |
| 模型檢查影片、截圖、問題紀錄 | `materials/live2d-v1/review/` | [上傳檢查資料](https://github.com/JackeyUi/AnzukiDest/upload/experiment/live2d-interaction/materials/live2d-v1/review) |

登入 GitHub，在這個實驗分支的資料夾按 **Add file → Upload files**，保留原檔及子目錄名稱再提交。網頁單檔超過 25 MiB 時改用 Git；大型 PSD／工程可用 Git LFS（需另外設定）或 GitHub Release 附件，並在交付清單留下原檔位置及 SHA-256。不要為了上傳而縮圖或重新壓縮。

這是倉庫的素材交付入口，**目前 App 的「自訂動畫」仍只接受動態 WebP，不能匯入 PSD／Live2D 模型**。目前不必重裝程式，也沒有需要套用的 Windows 更新 ZIP 或 Android APK。
