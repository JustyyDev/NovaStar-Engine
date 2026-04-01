#!/bin/bash
echo "===================================="
echo " NovaStar - NovaScript VS Code Extension Installer"
echo "===================================="
echo ""

if ! command -v code &> /dev/null; then
    echo "VS Code 'code' command not found."
    echo "Install it from VS Code: Ctrl+Shift+P > 'Shell Command: Install code command in PATH'"
    exit 1
fi

echo "Found VS Code! Installing NovaScript extension..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
code --install-extension "$SCRIPT_DIR/novascript-vscode" --force

if [ $? -eq 0 ]; then
    echo ""
    echo "NovaScript extension installed! Restart VS Code."
else
    echo "CLI install failed, trying manual copy..."
    mkdir -p "$HOME/.vscode/extensions/novascript-lang-0.2.5"
    cp -r "$SCRIPT_DIR/novascript-vscode/"* "$HOME/.vscode/extensions/novascript-lang-0.2.5/"
    echo "Copied. Restart VS Code."
fi
