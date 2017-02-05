require('./server/database').init(); // can pass connection string
require('./server/webServer').init(); // can pass port
require('./server/socketServer').init();
require('./server/downloader').init(); // can pass target dir
