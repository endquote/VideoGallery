const config = require('config');

const Database = require('./database');
const WebServer = require('./webServer');
const SocketServer = require('./socketServer');
const Downloader = require('./downloader');
const PowerMate = require('./powermate');

Database.init(config.get('database'));
WebServer.init(config.get('port'), config.get('downloads'), config.get('username'), config.get('password'));
SocketServer.init();
Downloader.init(config.get('downloads'));
PowerMate.init();
Database.cleanup();
