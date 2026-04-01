!macro customInstall
  ; Clean old data
  RMDir /r "$LOCALAPPDATA\NovaStar Engine"
  RMDir /r "$LOCALAPPDATA\Temp\novastar-updates"
  Delete "$APPDATA\NovaStar Engine\config.json"
  RMDir /r "$APPDATA\NovaStar Engine\Cache"
  RMDir /r "$APPDATA\NovaStar Engine\blob_storage"
  RMDir /r "$APPDATA\NovaStar Engine\Session Storage"
  RMDir /r "$APPDATA\NovaStar Engine\Local Storage"
  RMDir /r "$APPDATA\NovaStar Engine\Code Cache"
  RMDir /r "$APPDATA\NovaStar Engine\GPUCache"
  RMDir /r "$APPDATA\NovaStar Engine\WebStorage"

  ; VSCode extension - try CLI, fail silently
  nsExec::ExecToLog 'cmd /c code --install-extension "$INSTDIR\resources\extensions\novascript-vscode" --force 2>nul'
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
!macroend
