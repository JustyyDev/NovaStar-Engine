!macro customInstall
  ; ===== COMPLETELY CLEAN OLD VERSION DATA =====
  RMDir /r "$LOCALAPPDATA\NovaStar Engine"
  RMDir /r "$LOCALAPPDATA\Temp\novastar-updates"
  RMDir /r "$LOCALAPPDATA\NovaStar Engine\Crashpad"
  Delete "$APPDATA\NovaStar Engine\config.json"
  RMDir /r "$APPDATA\NovaStar Engine\Cache"
  RMDir /r "$APPDATA\NovaStar Engine\blob_storage"
  RMDir /r "$APPDATA\NovaStar Engine\Session Storage"
  RMDir /r "$APPDATA\NovaStar Engine\Local Storage"
  RMDir /r "$APPDATA\NovaStar Engine\Code Cache"
  RMDir /r "$APPDATA\NovaStar Engine\GPUCache"
  RMDir /r "$APPDATA\NovaStar Engine\WebStorage"

  ; ===== VSCODE EXTENSION INSTALL =====
  MessageBox MB_YESNO "Would you like to install the NovaScript VS Code extension?$\n$\nThis adds syntax highlighting, auto-completion, and snippets for .nova files.$\n$\n(Requires VS Code to be installed)" IDYES installExt IDNO skipExt

  installExt:
    ; Copy extension to a known location
    CreateDirectory "$LOCALAPPDATA\NovaStar Engine\vscode-ext"
    CopyFiles /SILENT "$INSTDIR\resources\extensions\novascript-vscode\*.*" "$LOCALAPPDATA\NovaStar Engine\vscode-ext\novascript-vscode\"
    ; Try VS Code CLI install
    nsExec::ExecToLog 'cmd /c "code --install-extension "$LOCALAPPDATA\NovaStar Engine\vscode-ext\novascript-vscode" --force 2>nul"'
    ; Direct copy fallback to VS Code extensions dir
    IfFileExists "$USERPROFILE\.vscode\extensions\*.*" 0 skipDirect
      CreateDirectory "$USERPROFILE\.vscode\extensions\novascript-language"
      CopyFiles /SILENT "$LOCALAPPDATA\NovaStar Engine\vscode-ext\novascript-vscode\*.*" "$USERPROFILE\.vscode\extensions\novascript-language\"
    skipDirect:

  skipExt:
!macroend

!macro customUnInstall
  RMDir /r "$LOCALAPPDATA\NovaStar Engine"
  RMDir /r "$LOCALAPPDATA\Temp\novastar-updates"
  RMDir /r "$APPDATA\NovaStar Engine\Cache"
  RMDir /r "$APPDATA\NovaStar Engine\blob_storage"
  RMDir /r "$APPDATA\NovaStar Engine\Session Storage"
  RMDir /r "$APPDATA\NovaStar Engine\Local Storage"
  RMDir /r "$APPDATA\NovaStar Engine\Code Cache"
  RMDir /r "$APPDATA\NovaStar Engine\GPUCache"
  RMDir /r "$USERPROFILE\.vscode\extensions\novascript-language"
!macroend
