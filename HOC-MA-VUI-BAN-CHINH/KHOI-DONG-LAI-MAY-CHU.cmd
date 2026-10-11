@echo off
rem HOC MA VUI - Khoi dong lai may chu noi bo (cong 8780) de nap phan moi (vi du: phan AI).
rem Khong xoa du lieu. Sau khi chay xong, hay tai lai trang ung dung (F5).
setlocal
set "HMVPID="
for /f "tokens=5" %%p in ('netstat -ano -p TCP ^| findstr /L /C:"127.0.0.1:8780 " ^| findstr /L /C:"0.0.0.0:0"') do set "HMVPID=%%p"
if not defined HMVPID goto startserver
tasklist /FI "PID eq %HMVPID%" 2>nul | findstr /I /L /C:"node.exe" >nul
if errorlevel 1 (
  echo Cong 8780 dang do mot chuong trinh khac su dung, khong phai may chu HOC MA VUI.
  echo Khong dung chuong trinh do. Hay dong chuong trinh do roi chay lai tep nay.
  pause
  exit /b 1
)
echo Dang dung may chu cu...
taskkill /PID %HMVPID% /F >nul 2>&1
timeout /t 2 /nobreak >nul
:startserver
echo Dang khoi dong may chu moi...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0MO-HOC-MA-VUI.ps1" -NoBrowser
if errorlevel 1 (
  echo.
  echo Khong khoi dong duoc may chu. Xem thong bao phia tren hoac tep server-error.log.
  pause
  exit /b 1
)
echo.
echo XONG. Hay quay lai trinh duyet va tai lai trang ung dung (phim F5).
timeout /t 6 >nul
