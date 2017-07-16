const socketio = require('socket.io');

const Database = require('./database');
const WebServer = require('./webServer');

class SocketServer {
  static init() {
    const io = socketio(WebServer.httpServer);
    this.io = io;
    console.log('Socket server listening');

    const selectedVideos = {};

    io.on('connection', (socket) => {
      console.log('UI socket connected');

      socket.on('joinChannel', (channelName) => {
        socket.join(channelName);
        socket.in(channelName).emit('videoSelected', selectedVideos[channelName]);
      });

      // Send events to the client when anything on the database changes.
      Database.on('videoAdded', v => socket.in(v.channelName).emit('videoAdded', v.video));
      Database.on('videoRemoved', v => socket.in(v.channelName).emit('videoRemoved', v.video));
      Database.on('videoUpdated', v => socket.in(v.channelName).emit('videoUpdated', v.video));

      // When a video is selected, tell other people on this channel about it.
      socket.on('selectVideo', (data) => {
        selectedVideos[data.channelName] = data.videoId;
        io.sockets.in(data.channelName).emit('videoSelected', data.videoId);
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
