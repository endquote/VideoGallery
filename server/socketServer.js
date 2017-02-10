const socketio = require('socket.io');

const Database = require('./database');
const WebServer = require('./webServer');

class SocketServer {
  static init() {
    this.io = socketio(WebServer.httpServer);
    console.log('Socket server listening');

    this.io.on('connection', (socket) => {
      console.log('Socket connected');

      // Send events to the client when anything on the database changes.
      Database.on('videoAdded', doc => socket.emit('videoAdded', doc));
      Database.on('videoRemoved', doc => socket.emit('videoRemoved', doc));
      Database.on('videoSelected', doc => socket.emit('videoSelected', doc));
      Database.on('videoUpdated', doc => socket.emit('videoUpdated', doc));
    });
  }

  static emit(msg, data) {
    this.io.emit(msg, data);
  }
}

module.exports = SocketServer;
