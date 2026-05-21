@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\switch-github-account.ps1" -Account Bruce-Li_xero -Scope local -RemoteOwner Bruce-Li_xero -Login
endlocal
