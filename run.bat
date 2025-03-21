@echo off
echo Freeing up ports and starting all services...
setlocal
set "ports=3000 3001 3002 3003 3004 3005 3006 3007 5500"
for %%p in (%ports%) do (
    echo Killing process on port %%p...
    netstat -ano | findstr :%%p >nul
    if %errorlevel%==0 (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p') do (
            taskkill /PID %%a /F >nul 2>&1
            echo Process on port %%p killed.
        )
    ) else (
        echo No process found on port %%p.
    )
)
echo Starting services...
cd /d "%~dp0\src\user-service"
start /B node main.js
cd /d "%~dp0\src\attendee-service"
start /B node main.js
cd /d "%~dp0\src\event_organizer-service"
start /B node main.js
cd /d "%~dp0\src\notification-service"
start /B node main.js
cd /d "%~dp0\src\event-service"
start /B node main.js
cd /d "%~dp0\src\booking-service"
start /B node main.js
cd /d "%~dp0\src\payment-service"
start /B node main.js
cd /d "%~dp0\src\frontend"
start /B python -m http.server 5500
start chrome "http://localhost:5500/index.html"
pause
