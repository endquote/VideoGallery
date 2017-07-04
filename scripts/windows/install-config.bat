SET DIR=%~dp0
cd %DIR%
mkdir C:\rgbtv
copy ..\..\server\config\default-windows.json C:\rgbtv\default.json
copy ..\..\server\config\default-windows.json C:\rgbtv\local.json
