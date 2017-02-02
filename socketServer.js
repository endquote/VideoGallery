const socketio = require('socket.io');

class SocketServer {
  static init(httpServer, database) {
    const io = socketio(httpServer);

    io.on('connection', (socket) => {
      database.getVideos().then((doc) => {
        socket.emit('videos', doc);
      });

      database.on('videoAdded', (doc) => {
        socket.emit('videoAdded', doc);
      });

      database.on('videoRemoved', (doc) => {
        socket.emit('videoRemoved', doc);
      });

      database.on('videoSelected', (doc) => {
        socket.emit('videoSelected', doc);
      });
    });

    io.on('addVideo', (data) => {
      database.addVideo(data.url);
    });

    io.on('removeVideo', (data) => {
      database.removeVide(data.url);
    });

    io.on('selectVideo', (data) => {
      database.selectVideo(data.url);
    });
  }
}

module.exports = SocketServer;
