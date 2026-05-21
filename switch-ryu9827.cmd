@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\switch-github-account.ps1" -Account ryu9827 -Scope local -RemoteOwner ryu9827 -Login
endlocal
