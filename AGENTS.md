# Anzuki maintenance

- ARTWORK IS THE HIGHEST PRIORITY. Preserve the original pixel resolution, frame rate and opaque character colors. Never downscale source assets, apply lossy re-encoding, convert RGBA to subsampled YUV, or trade visual quality for smaller downloads without explicit user approval.
- The canonical playback format is original-size 720×1280 lossless RGBA animated WebP. Verify decoded pixels against every keyed frame. Desktop and Android must use byte-identical assets; display sizing is not permission to reduce file resolution.

- Click speed is 1.0–2.0 in 0.1 increments, applied on the next click. Retiming may only alter WebP ANMF duration metadata in memory; never transcode frames. Keep long/short idle choices and range definitions synchronized via the shared playback config and index.
- Maintain both the desktop pet and native Android overlay app. The user asked that future changes stay synchronized.
- `pet/anzuki-config.json`, `pet/animations.json`, and `pet/anzuki-animation/*.webp` are the shared animation source of truth. Never maintain a second independent phone animation selection. Old WebM files are deprecated historical compatibility assets and must not become the default player.
- After desktop animation changes, regenerate Android assets with `scripts/sync-android-assets.py`, build `android/releases/Anzuki-Android.apk`, and run `scripts/check-platform-sync.py`. `scripts/update-all.py --sdk <sdk>` performs the full source-video pipeline and Android build.
- Keep the existing development signing key under `.local/android-signing/` for compatible APK updates. Never commit signing keys, keystores, build caches, runtime data, or credentials.
- Retain original uploaded media and processed outputs when the user supplies new source footage. Keep prior character references for comparison.
- The user has authorized publishing Anzuki reference revisions, prompts, source changes and uploads to the public `JackeyUi/AnzukiDest` repository until revoked. Do not upload to Google Drive unless separately requested.
- Report validation accurately: successful compilation and APK signature checks do not establish successful interaction on a physical Android device.
