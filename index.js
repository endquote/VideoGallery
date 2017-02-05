require('./database').init(); // can pass connection string
require('./webServer').init(); // can pass port
require('./socketServer').init();
require('./downloader').init(); // can pass target dir
