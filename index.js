const Database = require('./database');
const WebServer = require('./webServer');
const SocketServer = require('./socketServer');
const Downloader = require('./downloader');

const database = new Database();
WebServer.init(database);
SocketServer.init(WebServer.httpServer, database);
Downloader.init(database);
