SET DIR=%~dp0
cd %DIR%
cd ..\..\
set NODE_CONFIG_DIR=C:\rgbtv
FOR /F "tokens=* USEBACKQ" %%F IN (`node client/src/scripts/client-url.js`) DO (SET RGBTV_URL=%%F)
timeout 30
"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" --kiosk --incognito --disable-pinch --overscroll-history-navigation=0 %RGBTV_URL%
