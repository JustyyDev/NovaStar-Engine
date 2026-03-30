!macro customInstall
  ; ===== COMPLETELY CLEAN OLD VERSION DATA =====
  ; This ensures upgrading from ANY old version works cleanly.
  ; User projects are stored in Documents, not in AppData.
  
  ; Nuke ALL Electron app data (this is what causes "stuck on old version")
  RMDir /r "$LOCALAPPDATA\NovaStar Engine"
  
  ; Remove old temp update files
  RMDir /r "$LOCALAPPDATA\Temp\novastar-updates"
  
  ; Remove old Electron crash dumps
  RMDir /r "$LOCALAPPDATA\NovaStar Engine\Crashpad"
  
  ; Clear any leftover roaming data (but NOT user projects)
  ; Projects will be stored in Documents\NovaStar Projects (safe)
  Delete "$APPDATA\NovaStar Engine\config.json"
  RMDir /r "$APPDATA\NovaStar Engine\Cache"
  RMDir /r "$APPDATA\NovaStar Engine\blob_storage"
  RMDir /r "$APPDATA\NovaStar Engine\Session Storage"
  RMDir /r "$APPDATA\NovaStar Engine\Local Storage"
  RMDir /r "$APPDATA\NovaStar Engine\Code Cache"
  RMDir /r "$APPDATA\NovaStar Engine\GPUCache"
  RMDir /r "$APPDATA\NovaStar Engine\WebStorage"
!macroend

!macro customUnInstall
  ; Full cleanup on uninstall
  RMDir /r "$LOCALAPPDATA\NovaStar Engine"
  RMDir /r "$LOCALAPPDATA\Temp\novastar-updates"
  RMDir /r "$APPDATA\NovaStar Engine\Cache"
  RMDir /r "$APPDATA\NovaStar Engine\blob_storage"
  RMDir /r "$APPDATA\NovaStar Engine\Session Storage"
  RMDir /r "$APPDATA\NovaStar Engine\Local Storage"
  RMDir /r "$APPDATA\NovaStar Engine\Code Cache"
  RMDir /r "$APPDATA\NovaStar Engine\GPUCache"
  ; Note: user projects in Documents\NovaStar Projects are NOT deleted
!macroend
