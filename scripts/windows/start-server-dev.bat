SET DIR=%~dp0
cd %DIR%
cd ../../
set NODE_CONFIG_DIR=C:\VideoGallery
start /b npm --prefix server start 
npm --prefix client run dev