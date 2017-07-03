SET DIR=%~dp0
cd %DIR%
mkdir C:\VideoGallery
copy ..\..\server\config\default-windows.json C:\VideoGallery\default.json
copy ..\..\server\config\default-windows.json C:\VideoGallery\local.json
