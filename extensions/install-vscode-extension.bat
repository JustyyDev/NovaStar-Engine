@echo off
echo ====================================
echo  NovaStar - NovaScript VS Code Extension Installer
echo ====================================
echo.

where code >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo VS Code command 'code' not found in PATH.
    echo.
    echo Please make sure VS Code is installed and the 'code' command is available.
    echo In VS Code: Ctrl+Shift+P ^> "Shell Command: Install 'code' command in PATH"
    echo.
    pause
    exit /b 1
)

echo Found VS Code! Installing NovaScript extension...
echo.

:: Get the directory this script is in
set SCRIPT_DIR=%~dp0

:: Install the extension from the local folder
code --install-extension "%SCRIPT_DIR%novascript-vscode" --force

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo  NovaScript extension installed!
    echo  Restart VS Code to activate it.
    echo ====================================
) else (
    echo.
    echo Installation failed. Trying manual copy...
    
    :: Fallback: copy directly to extensions folder
    if exist "%USERPROFILE%\.vscode\extensions" (
        xcopy /E /I /Y "%SCRIPT_DIR%novascript-vscode" "%USERPROFILE%\.vscode\extensions\novascript-lang-0.2.5" >nul
        echo Copied extension files to VS Code extensions directory.
        echo Restart VS Code to activate.
    ) else (
        echo Could not find VS Code extensions directory.
        echo Please install the extension manually from the novascript-vscode folder.
    )
)
echo.
pause
