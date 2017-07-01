const config = require('config');

const SocketServer = require('./socketServer');
const PowerMate = require('./powermate');

SocketServer.init();
PowerMate.init();
