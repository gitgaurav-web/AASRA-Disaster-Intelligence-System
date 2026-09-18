@echo off
echo ===================================================
echo     AASRA Mobile Application Build and Sync
echo ===================================================
echo.
echo [1/3] Building Web Assets (Vite Production Build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Web build failed. Please fix errors and try again.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Syncing Assets to Native Android Project...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Capacitor sync failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Mobile Assets Synced Successfully!
echo.
echo To open project in Android Studio to build APK or run emulator:
echo   Run: npm run mobile:open
echo   Or open the 'android' folder directly in Android Studio.
echo ===================================================
pause
