const config = require('config');

const Database = require('./database');
const WebServer = require('./webServer');
const SocketServer = require('./socketServer');
const Downloader = require('./downloader');

class Server {
  static async init() {
    await Database.init(config.get('database'));
    await Downloader.init(config.get('downloads'));
    await WebServer.init(config.get('port'), config.get('downloads'), config.get('username'), config.get('password'));
    await SocketServer.init();
    await Database.cleanup();
  }
}

Server.init();
