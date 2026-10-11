@echo off
chcp 65001 >nul
title SYMPOSIUM STUDIO — Baslatiliyor...
cd /d "%~dp0"

echo ============================================================
echo   SYMPOSIUM STUDIO — Konferans ve Ceviri Konsolu
echo ============================================================
echo.
echo   Yerel sunucu baslatiliyor: http://localhost:3000
echo   Mikrofon izni bir kez verildikten sonra kalici olacaktir.
echo.

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start http://localhost:3000
    python -m http.server 3000
    goto end
)

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start http://localhost:3000
    npx -y serve . -l 3000
    goto end
)

start index.html

:end
