@echo off
title Apex OS - Otomatik Baslama Kurulumu
color 0A

echo ===================================================
echo APEX OS - Otomatik Baslama Kurulumu
echo ===================================================
echo.

set TASK_NAME=ApexOS
set VBS_PATH=C:\Users\ASUS\.gemini\antigravity\scratch\apex-arkaplanda-baslat.vbs

echo Mevcut gorev siliniyor (varsa)...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

echo Otomatik baslama gorevi olusturuluyor...
schtasks /create /tn "%TASK_NAME%" /tr "wscript.exe \"%VBS_PATH%\"" /sc ONLOGON /ru "%USERNAME%" /rl HIGHEST /f

if %errorlevel% == 0 (
    echo.
    echo [BASARILI] Apex OS artik bilgisayar acildiginda otomatik baslaacak!
    echo.
    echo Simdi test etmek ister misiniz?
    echo Uygulama su an baslatiliyor...
    echo.
    wscript.exe "%VBS_PATH%"
    echo.
    echo 5 saniye bekleyin, sonra tarayicinizda http://localhost:3000 adresini acin.
) else (
    echo.
    echo [HATA] Gorev olusturulamadi. Lutfen bu dosyayi sag tikla - Yonetici olarak calistir.
)

echo.
pause
