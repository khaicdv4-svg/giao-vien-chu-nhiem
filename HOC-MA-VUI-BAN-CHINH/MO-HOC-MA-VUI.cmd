@echo off
rem HOC MA VUI - ThayKhaiEdu - BAN CHINH. Bam dup tep nay de mo ung dung.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0MO-HOC-MA-VUI.ps1"
if errorlevel 1 (
  echo.
  echo Khong mo duoc ung dung. Xem thong bao phia tren hoac tep server-error.log.
  pause
)
