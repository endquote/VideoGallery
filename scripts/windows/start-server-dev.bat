SET DIR=%~dp0
cd %DIR%
cd ..\..\
set NODE_CONFIG_DIR=C:\VideoGallery
npm --prefix server run dev
npm --prefix client run dev