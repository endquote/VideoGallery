const socketio = require('socket.io');

class SocketServer {
  static init() {
    this.io = socketio(8181);
    console.log('Socket server listening');

    this.io.on('connection', (socket) => {
      console.log('Controller socket connected');
    });
  }

  static emit(msg, data) {
    if (this.io) {
      this.io.emit(msg, data);
    }
  }
}

module.exports = SocketServer;
