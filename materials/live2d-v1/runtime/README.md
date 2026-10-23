# 執行模型包

建議完整放入 `anzuki/`，保留建模師的輸出檔名和子目錄。示例結構（這些模型檔目前尚不存在）：

```text
anzuki/
  Anzuki.model3.json
  Anzuki.moc3
  textures/texture_00.png
  Anzuki.physics3.json
  motions/idle.motion3.json
  motions/tap_head.motion3.json
  expressions/smile.exp3.json
```

`.model3.json` 指向的所有檔案都要交付。圖檔使用原尺寸無損 PNG，Windows 與 Android 共用同一包原始位元。不要只交 moc3、展示影片，或把示意文字改名當成模型檔。

骨骼播放器尚未整合，現有 App 不會自動掃描這個目錄。範圍、實際 ID 和依賴見 [交付規格](../ART-BRIEF.zh-TW.md)。
