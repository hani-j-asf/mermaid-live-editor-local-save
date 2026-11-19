' Runs start-app.cmd without any visible console window (0 = hidden).
Set fso = CreateObject("Scripting.FileSystemObject")
CreateObject("WScript.Shell").Run "cmd /c """ & fso.GetParentFolderName(WScript.ScriptFullName) & "\start-app.cmd""", 0, False
