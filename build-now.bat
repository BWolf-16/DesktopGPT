@echo off
echo Building Desktop GPT for Windows...
echo.

rem Set environment variables to disable code signing
set CSC_IDENTITY_AUTO_DISCOVERY=false
set WIN_CSC_LINK=
set WIN_CSC_KEY_PASSWORD=

rem Run the build
npm run build:win

echo.
echo Build complete! Check the dist folder for output files.
pause
