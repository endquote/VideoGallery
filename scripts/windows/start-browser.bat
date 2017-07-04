SET DIR=%~dp0
cd %DIR%
cd ..\..\
set NODE_CONFIG_DIR=C:\rgbtv
SET RGBTV_URL=node client/src/scripts/client-url.js
timeout 30
"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" --kiosk --incognito --disable-pinch --overscroll-history-navigation=0 %RGBTV_URL%
