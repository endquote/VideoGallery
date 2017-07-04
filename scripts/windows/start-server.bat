SET DIR=%~dp0
cd %DIR%
cd ..\..\
set NODE_CONFIG_DIR=C:\rgbtv
npm --prefix server start
