@echo off
echo Starting PocketBase server...
echo Dashboard: http://localhost:8090/_/
echo.
pocketbase.exe serve --http=0.0.0.0:8090
pause
