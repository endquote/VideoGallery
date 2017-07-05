const socketio = require('socket.io');

const Database = require('./database');
const WebServer = require('./webServer');

class SocketServer {
  static init() {
    this.io = socketio(WebServer.httpServer);
    console.log('Socket server listening');

    this.io.on('connection', (socket) => {
      console.log('UI socket connected');

      // Send events to the client when anything on the database changes.
      Database.on('videoAdded', doc => socket.emit('videoAdded', doc.video));
      Database.on('videoRemoved', doc => socket.emit('videoRemoved', doc.video));
      Database.on('videoUpdated', doc => socket.emit('videoUpdated', doc.video));

      socket.emit('videoSelected', this.selectedVideo);

      socket.on('selectVideo', (data) => {
        this.selectedVideo = data;
        this.io.emit('videoSelected', this.selectedVideo);
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
