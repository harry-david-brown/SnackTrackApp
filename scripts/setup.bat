@echo off
REM Snack Track App - Windows Setup Script

echo.
echo 🚀 Setting up Snack Track App (Windows)...
echo.

REM Check Node.js version
echo [INFO] Checking Node.js version...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js 20 LTS from https://nodejs.org/
    echo After installation, restart your terminal and run: npm run setup
    exit /b 1
)

REM Get Node.js version
for /f "tokens=1 delims=." %%a in ('node --version') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%

if %NODE_MAJOR% LSS 20 (
    echo [ERROR] Node.js version is too old!
    echo.
    echo Current version: 
    node --version
    echo Required: v20.0.0 or higher
    echo.
    echo Please install Node.js 20 LTS from https://nodejs.org/
    echo After installation, restart your terminal and run: npm run setup
    exit /b 1
)

echo [SUCCESS] Node.js version is compatible
node --version
echo.

REM Install dependencies
echo [INFO] Installing dependencies...
echo This may take a few minutes...
echo.
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install dependencies
    echo Try running: npm install --legacy-peer-deps
    exit /b 1
)

echo.
echo [SUCCESS] Dependencies installed!
echo.

REM Create .env file if it doesn't exist
if not exist .env (
    if exist .env.example (
        echo [INFO] Creating .env file...
        copy .env.example .env >nul
        echo [SUCCESS] Created .env file
        echo.
        echo IMPORTANT: Edit .env and set EXPO_PUBLIC_API_URL to your backend API
    ) else (
        echo [INFO] Creating basic .env file...
        (
            echo # API Configuration
            echo EXPO_PUBLIC_API_URL=http://localhost:3000
            echo.
            echo # App Configuration
            echo APP_NAME=Snack Track
            echo APP_VERSION=1.0.0
            echo.
            echo # Development
            echo NODE_ENV=development
            echo DEBUG=true
        ) > .env
        echo [SUCCESS] Created .env file
        echo.
        echo IMPORTANT: Edit .env and set EXPO_PUBLIC_API_URL to your backend API
    )
    echo.
) else (
    echo [INFO] .env file already exists, skipping...
    echo.
)

REM Check Expo
echo [INFO] Checking Expo...
call npx expo --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Expo check failed, but should work when you run npm start
) else (
    echo [SUCCESS] Expo is ready
)
echo.

REM Success message
echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file and set EXPO_PUBLIC_API_URL
echo 2. Make sure Snack Track backend API is running
echo 3. Run: npm start
echo 4. Scan QR code with Expo Go app on your phone
echo.
echo Happy coding! 🚀
echo.

