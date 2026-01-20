@echo off
echo ==========================================
echo    AI-Gatekeep Terminal Setup (Windows)
echo ==========================================

:: Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed.
    echo Please install Node.js (v18 or higher recommended) from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found.

:: Install dependencies
echo.
echo Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies.
    pause
    exit /b 1
)

echo Dependencies installed successfully.

:: Build option
echo.
set /p build_choice="Do you want to build the project for production? (y/n) "
if /i "%build_choice%"=="y" (
    echo Building project...
    call npm run build
)

echo.
echo Setup complete!
echo To start the development server, run: npm run dev
echo To start the production server (if built), run: npm start
echo.
pause
