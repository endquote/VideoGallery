const socketio = require('socket.io');

const Database = require('./database');
const WebServer = require('./webServer');

class SocketServer {
  static init() {
    const io = socketio(WebServer.httpServer);
    this.io = io;
    console.log('Socket server listening');

    this.tunerStates = {};
    this.defaultTunerName = 'default';

    // Send events to the client when anything on the database changes.
    Database.on('videoAdded', v => io.emit('videoAdded', v));
    Database.on('videoRemoved', v => io.emit('videoRemoved', v));
    Database.on('videoUpdated', v => io.emit('videoUpdated', v));

    // Tell tuners about changes to channels and videos.
    io.on('connection', (socket) => {
      console.log('UI socket connected');

      // Called by a tuner when it first connects, to set/get state on the tuner.
      socket.on('tunerOn', ({ tuner, channel, video }) => {
        tuner = tuner || SocketServer.defaultTunerName;
        const state = SocketServer.getTunerState(tuner);
        // A new instance of a tuner can specify a video, but can't say no video.
        state.video = video || state.video;
        // A new instance of a tuner can specify a new channel.
        state.channel = channel;
        socket.join(tuner);
        console.info('tunerOn', tuner, JSON.stringify(state));
        io.sockets.in(tuner).emit('tunerChanged', state);
        io.sockets.in('admin').emit('tunerChanged', SocketServer.getTunerList());
      });

      // Whenever a tuner changes channels/videos, tell the other instances.
      socket.on('tunerChanged', ({ tuner, channel, video }) => {
        tuner = tuner || SocketServer.defaultTunerName;
        const state = SocketServer.getTunerState(tuner);
        state.video = video;
        state.channel = channel;
        console.info('tunerChanged', tuner, JSON.stringify(state));
        io.sockets.in(tuner).emit('tunerChanged', state);
        io.sockets.in('admin').emit('tunerChanged', SocketServer.getTunerList());
      });

      socket.on('tunerAdmin', () => {
        socket.join('admin');
        socket.emit('tunerChanged', SocketServer.getTunerList());
      });
    });
  }

  static getTunerState(tuner) {
    tuner = tuner || '';
    this.tunerStates[tuner] = this.tunerStates[tuner] || { tuner, channel: null, video: null };
    return this.tunerStates[tuner];
  }

  static getTunerList() {
    // Get an array of objects describing the tuners.
    const names = Object.keys(this.tunerStates);
    const tuners = [];
    names.forEach(n => tuners.push({ name: n, channel: this.tunerStates[n].channel, video: this.tunerStates[n].video }));

    // Move the default tuner to the front of the list.
    const defaultIndex = tuners.findIndex(n => n.name === SocketServer.defaultTunerName);
    if (defaultIndex !== -1) {
      const defaultTuner = tuners[defaultIndex];
      tuners.splice(defaultIndex, 1);
      tuners.unshift(defaultTuner);
    }

    return tuners;
  }

  static emit(msg, data) {
    if (this.io) {
      this.io.emit(msg, data);
    }
  }
}

module.exports = SocketServer;
