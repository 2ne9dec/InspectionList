@echo off
echo Starting PocketBase via Docker...
echo Dashboard will be at: http://localhost:8090/_/
echo.
cd /d "%~dp0.."
docker compose up -d
echo.
echo PocketBase is running. Press any key to stop...
pause
docker compose down
