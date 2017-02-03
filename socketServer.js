const socketio = require('socket.io');

class SocketServer {
  static init(httpServer, database) {
    const io = socketio(httpServer);

    io.on('connection', (socket) => {
      // Send the full list when connected.
      database.getVideos().then(doc => socket.emit('videos', doc));

      // Send events to the client when anything on the database changes.
      database.on('videoAdded', doc => socket.emit('videoAdded', doc));
      database.on('videoRemoved', doc => socket.emit('videoRemoved', doc));
      database.on('videoSelected', doc => socket.emit('videoSelected', doc));

      // Change things in the database when the client requests it.
      socket.on('addVideo', data => database.addVideo(data.url));
      socket.on('removeVideo', data => database.removeVideo(data.url));
      socket.on('selectVideo', data => database.selectVideo(data.url));
    });
  }
}

module.exports = SocketServer;
