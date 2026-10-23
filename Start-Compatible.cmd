@echo off
if not exist "%~dp0Anzuki.exe" (
 echo Place this file beside Anzuki.exe.
 pause
 exit /b 1
)
start "" "%~dp0Anzuki.exe" --disable-gpu
