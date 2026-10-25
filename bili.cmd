@echo off
cd /d "%~dp0"
echo ==============================================
echo   CodeBuddy Web UI  -  bili-scroll
echo   http://127.0.0.1:7891
echo ==============================================
echo.
call codebuddy --serve --agent cli --port 7891 --plugin-dir "%~dp0." --open
echo.
echo Server stopped. Press any key to close this window.
pause >nul
