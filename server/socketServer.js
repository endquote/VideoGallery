const socketio = require("socket.io");

const Database = require("./database");
const WebServer = require("./webServer");

class SocketServer {
  static init() {
    const io = socketio(WebServer.httpServer);
    this.io = io;
    console.log("Socket server listening");

    this.tunerStates = {};
    this.defaultTunerName = "default";

    // Send events to the client when anything on the database changes.
    Database.on("videoAdded", v => io.emit("videoAdded", v));
    Database.on("videoRemoved", v => io.emit("videoRemoved", v));
    Database.on("videoUpdated", v => io.emit("videoUpdated", v));

    // Tell tuners about changes to channels and videos.
    io.on("connection", socket => {
      // Called by a tuner when it first connects, to set/get state on the tuner.
      socket.on("tunerOn", ({ tuner, channel, video }) => {
        console.log("Player socket connected");
        tuner = tuner || SocketServer.defaultTunerName;
        const state = SocketServer.getTunerState(tuner, socket);
        // A new instance of a tuner can specify a video, but can't say no video.
        state.video = video || state.video;
        // A new instance of a tuner can specify a new channel.
        state.channel = channel;
        socket.join(tuner);
        this.sendTunerState(tuner);
      });

      // Called by the admin page when it first connects.
      socket.on("tunerAdmin", () => {
        console.log("Admin socket connected");
        socket.join("admin");
        socket.emit("tunerChanged", SocketServer.getTunerStates());
      });

      // When a controller connects itself, save it.
      socket.on("controllerOn", tuner => {
        console.log("Controller socket connected");
        socket.join(tuner);
        const state = this.getTunerState(tuner);
        state.controller = socket;
      });

      // Keep track of the sockets in each tuner.
      socket.on("disconnect", () => {
        Object.keys(this.tunerStates).forEach(t => {
          const state = this.tunerStates[t];
          const i = state.sockets.indexOf(socket);
          if (i !== -1) {
            state.sockets.splice(i, 1);
          }
          if (state.controller === socket) {
            state.controller = null;
          }
        });
      });

      // Whenever a tuner changes channels/videos, tell the other instances.
      socket.on("tunerChanged", ({ tuner, channel, video, info, audio }) => {
        tuner = tuner || SocketServer.defaultTunerName;
        const state = SocketServer.getTunerState(tuner, socket);
        state.video = video;
        state.channel = channel;
        state.info = info;
        state.audio = audio;
        this.sendTunerState(tuner);
      });

      // When the admin page connects, tell it about the tuners.
      // Send playback controls to tuners.
      socket.on("tunerNext", tuner =>
        this.getTunerState(tuner).sockets[0].emit("nextVideo")
      );
      socket.on("seekForward", tuner =>
        io.sockets.in(tuner).emit("seekForward")
      );
      socket.on("seekBack", tuner => io.sockets.in(tuner).emit("seekBack"));
      socket.on("nextMode", tuner => io.sockets.in(tuner).emit("nextMode"));
      socket.on("controller", (tuner, state) =>
        io.sockets.in(tuner).emit("controller", state)
      );
      socket.on("info", tuner => {
        const state = this.getTunerState(tuner);
        state.info = !state.info;
        this.sendTunerState(tuner);
      });
      socket.on("audio", tuner => {
        const state = this.getTunerState(tuner);
        state.audio = !state.audio;
        this.sendTunerState(tuner);
      });
    });
  }

  // Get or create a tuner state.
  static getTunerState(tuner, socket) {
    tuner = tuner || this.defaultTunerName;
    const state = this.tunerStates[tuner] || {
      name: tuner,
      channel: null,
      video: null,
      info: false,
      audio: false,
      controller: null,
      sockets: []
    };
    if (socket && state.sockets.indexOf(socket) === -1) {
      state.sockets.push(socket);
    }
    this.tunerStates[tuner] = state;
    return state;
  }

  // Send a tuner state to admin and the other tuners with the same name.
  static sendTunerState(tuner) {
    const tuners = this.getTunerStates();
    this.io.sockets.in(tuner).emit("tunerChanged", tuners[tuner]);
    this.io.sockets.in("admin").emit("tunerChanged", tuners);
  }

  static getTunerStates() {
    // Get an array of objects describing the tuners.
    const tuners = {};
    Object.keys(this.tunerStates).forEach(tuner => {
      const original = this.getTunerState(tuner);
      const copy = {};
      Object.keys(original).forEach(k => {
        if (k !== "sockets" && k !== "controller") {
          copy[k] = original[k];
        }
      });
      tuners[tuner] = copy;
    });

    return tuners;
  }

  static emit(msg, data) {
    if (this.io) {
      this.io.emit(msg, data);
    }
  }
}

module.exports = SocketServer;
