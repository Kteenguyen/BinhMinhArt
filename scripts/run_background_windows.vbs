Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)

If fso.FileExists(strDir & "\start_windows.bat") Then
    WshShell.Run Chr(34) & strDir & "\start_windows.bat" & Chr(34), 0, False
ElseIf fso.FileExists(strDir & "\..\start_windows.bat") Then
    WshShell.Run Chr(34) & fso.GetAbsolutePathName(strDir & "\..\start_windows.bat") & Chr(34), 0, False
End If

Set fso = Nothing
Set WshShell = Nothing
