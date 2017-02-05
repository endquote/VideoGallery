const socketio = require('socket.io');

const Database = require('./database');
const WebServer = require('./webServer');

class SocketServer {
  static init() {
    const io = socketio(WebServer.httpServer);

    io.on('connection', (socket) => {
      // Send the full list when connected.
      Database.getVideos().then(doc => socket.emit('videos', doc));

      // Send events to the client when anything on the database changes.
      Database.on('videoAdded', doc => socket.emit('videoAdded', doc));
      Database.on('videoRemoved', doc => socket.emit('videoRemoved', doc));
      Database.on('videoSelected', doc => socket.emit('videoSelected', doc));
      Database.on('videoUpdated', doc => socket.emit('videoUpdated', doc));
    });
  }
}

module.exports = SocketServer;
