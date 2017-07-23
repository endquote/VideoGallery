const socketio = require('socket.io');

const Database = require('./database');
const WebServer = require('./webServer');

class SocketServer {
  static init() {
    const io = socketio(WebServer.httpServer);
    this.io = io;
    console.log('Socket server listening');

    this.tunerStates = {};

    // Send events to the client when anything on the database changes.
    Database.on('videoAdded', v => io.emit('videoAdded', v));
    Database.on('videoRemoved', v => io.emit('videoRemoved', v));
    Database.on('videoUpdated', v => io.emit('videoUpdated', v));

    // Tell tuners about changes to channels and videos.
    io.on('connection', (socket) => {
      console.log('UI socket connected');

      // Called by a tuner when it first connects, to set/get state on the tuner.
      socket.on('tunerOn', ({ tuner, channel, video }) => {
        const state = SocketServer.getTunerState(tuner);
        // A new instance of a tuner can specify a video, but can't say no video.
        state.video = video || state.video;
        // A new instance of a tuner can specify a new channel.
        state.channel = channel;
        socket.join(tuner);
        console.info('tunerOn', tuner, JSON.stringify(state));
        io.sockets.in(tuner).emit('tunerChanged', state);
      });

      // Whenever a tuner changes channels/videos, tell the other instances.
      socket.on('tunerChanged', ({ tuner, channel, video }) => {
        const state = SocketServer.getTunerState(tuner);
        state.video = video;
        state.channel = channel;
        console.info('tunerChanged', tuner, JSON.stringify(state));
        io.sockets.in(tuner).emit('tunerChanged', state);
      });
    });
  }

  static getTunerState(tuner) {
    tuner = tuner || '';
    this.tunerStates[tuner] = this.tunerStates[tuner] || { tuner, channel: null, video: null };
    return this.tunerStates[tuner];
  }

  static emit(msg, data) {
    if (this.io) {
      this.io.emit(msg, data);
    }
  }
}

module.exports = SocketServer;
