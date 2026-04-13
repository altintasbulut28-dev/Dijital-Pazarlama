Dim WshShell
Set WshShell = CreateObject("WScript.Shell")

' Sunucuyu arka planda baslat
WshShell.Run "cmd /c cd /d ""C:\Users\ASUS\.gemini\antigravity\scratch"" && npm run dev > ""%TEMP%\apex-os-log.txt"" 2>&1", 0, False

' Sunucunun ayaga kalkması için 15 saniye bekle
WScript.Sleep 15000

' Dashboard'u varsayilan tarayicida ac
WshShell.Run "http://localhost:3000/dashboard", 1, False
