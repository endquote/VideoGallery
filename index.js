const Database = require('./database');
const WebServer = require('./webServer');
const SocketServer = require('./socketServer');
const Downloader = require('./downloader');

const database = new Database(); // can pass connection string
WebServer.init(database); // can pass port
SocketServer.init(WebServer.httpServer, database);
Downloader.init(database); // can pass target dir
