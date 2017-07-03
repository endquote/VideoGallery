SET DIR=%~dp0
cd %DIR%
mkdir %HOMEDRIVE%%HOMEPATH%\.VideoGallery
copy ..\..\server\config\default-windows.json %HOMEDRIVE%%HOMEPATH%\.VideoGallery\default.json
copy ..\..\server\config\default-windows.json %HOMEDRIVE%%HOMEPATH%\.VideoGallery\local.json
