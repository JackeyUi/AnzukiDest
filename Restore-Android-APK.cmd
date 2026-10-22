@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.12 or newer from https://nodejs.org/
  pause
  exit /b 1
)
node scripts\restore-android-release.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
echo Open android\releases\Anzuki-Android.apk and send it to your Android phone.
pause
