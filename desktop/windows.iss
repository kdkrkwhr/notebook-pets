#ifndef AppVersion
  #define AppVersion "0.1.0a3"
#endif
[Setup]
AppId={{5A056F47-0595-446A-B8EC-E7086B6A55AF}
AppName=NoteBuddy
AppVersion={#AppVersion}
AppPublisher=kdkrkwhr
DefaultDirName={localappdata}\Programs\NoteBuddyDesktop
DefaultGroupName=NoteBuddy
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename=NoteBuddy-{#AppVersion}-windows-x64-setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\NoteBuddy.exe
CloseApplications=yes
RestartApplications=no
[Files]
Source: "{#BundleDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\NoteBuddy"; Filename: "{app}\NoteBuddy.exe"
Name: "{userdesktop}\NoteBuddy"; Filename: "{app}\NoteBuddy.exe"; Tasks: desktopicon
[Tasks]
Name: desktopicon; Description: "Create a desktop shortcut"; Flags: unchecked
[Run]
Filename: "{app}\NoteBuddy.exe"; Description: "Open NoteBuddy"; Flags: nowait postinstall skipifsilent
; App data is outside {app}. Uninstall never removes workspaces or CLI accounts.
