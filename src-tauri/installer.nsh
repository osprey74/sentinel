; NSIS installer hooks for Sentinel
;
; Before install/uninstall, stop any running Sentinel or LibreHardwareMonitor
; processes so their file handles release the bundled resource DLLs
; (resources/lhm/*.dll). Without this, NSIS shows
;   "Error opening file for writing: Aga.Controls.dll"
; when the user upgrades while Sentinel (or its bundled LHM child) is still
; running in the tray.

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Stopping Sentinel and LibreHardwareMonitor before install..."
  nsExec::Exec 'taskkill /F /T /IM Sentinel.exe'
  Pop $0
  nsExec::Exec 'taskkill /F /T /IM LibreHardwareMonitor.exe'
  Pop $0
  Sleep 500
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Stopping Sentinel and LibreHardwareMonitor before uninstall..."
  nsExec::Exec 'taskkill /F /T /IM Sentinel.exe'
  Pop $0
  nsExec::Exec 'taskkill /F /T /IM LibreHardwareMonitor.exe'
  Pop $0
  Sleep 500
!macroend
