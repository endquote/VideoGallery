const Database = require('./database');
const WebServer = require('./webServer');
const SocketServer = require('./socketServer');

const database = new Database();
WebServer.init(database);
SocketServer.init(WebServer.httpServer, database);
