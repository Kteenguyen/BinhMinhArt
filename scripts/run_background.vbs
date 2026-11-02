Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

strDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = strDir

If fso.FileExists(strDir & "\start_windows.bat") Then
    projectDir = strDir
ElseIf fso.FileExists(strDir & "\..\start_windows.bat") Then
    projectDir = fso.GetAbsolutePathName(strDir & "\..")
End If

WshShell.CurrentDirectory = projectDir
WshShell.Run Chr(34) & projectDir & "\start_windows.bat" & Chr(34), 0, False

Set fso = Nothing
Set WshShell = Nothing
