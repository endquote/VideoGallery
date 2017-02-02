const socketio = require('socket.io');

class SocketServer {
  static init(httpServer, database) {
    const io = socketio(httpServer);

    io.on('connection', (socket) => {
      database.getVideos().then((doc) => {
        socket.emit('videos', doc);
      });
    });

    io.on('addVideo', (data) => {

    });

    io.on('deleteVideo', (data) => {

    });

    io.on('selectVideo', (data) => {

    });
  }
}

module.exports = SocketServer;
