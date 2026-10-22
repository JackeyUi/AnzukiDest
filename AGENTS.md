# Anzuki maintenance

- Maintain both the desktop pet and native Android overlay app. The user asked that future changes stay synchronized.
- `pet/anzuki-config.json` and `pet/anzuki-animation/` are the shared animation source of truth. Never maintain a second independent phone animation selection.
- After desktop animation changes, regenerate Android assets with `scripts/sync-android-assets.py`, build `android/releases/Anzuki-Android.apk`, and run `scripts/check-platform-sync.py`. `scripts/update-all.py --sdk <sdk>` performs the full source-video pipeline and Android build.
- Keep the existing development signing key under `.local/android-signing/` for compatible APK updates. Never commit signing keys, keystores, build caches, runtime data, or credentials.
- Retain original uploaded media and processed outputs when the user supplies new source footage. Keep prior character references for comparison.
- The user has authorized publishing Anzuki reference revisions, prompts, source changes and uploads to the public `JackeyUi/AnzukiDest` repository until revoked. Do not upload to Google Drive unless separately requested.
- Report validation accurately: successful compilation and APK signature checks do not establish successful interaction on a physical Android device.
