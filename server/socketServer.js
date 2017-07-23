const socketio = require('socket.io');

const Database = require('./database');
const WebServer = require('./webServer');

class SocketServer {
  static init() {
    const io = socketio(WebServer.httpServer);
    this.io = io;
    console.log('Socket server listening');

    const tunerStates = {};

    // Send events to the client when anything on the database changes.
    Database.on('videoAdded', v => io.emit('videoAdded', v));
    Database.on('videoRemoved', v => io.emit('videoRemoved', v));
    Database.on('videoUpdated', v => io.emit('videoUpdated', v));

    // Tell tuners about changes to channels and videos.
    io.on('connection', (socket) => {
      console.log('UI socket connected');
      socket.emit('tunerChanged', tunerStates);
      socket.on('tunerChanged', (tuner, channel, video) => {
        tunerStates[tuner] = { channel, video };
        socket.emit('tunerChanged', tunerStates);
      });
    });
  }

  static emit(msg, data) {
    if (this.io) {
      this.io.emit(msg, data);
    }
  }
}

module.exports = SocketServer;
