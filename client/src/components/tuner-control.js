// Playback controls for current tuner
module.exports = {
  props: ['tuner', 'socket'],
  template: require('./tuner-control.html'),
  methods: {
    nextVideo() {
      this.socket.emit('tunerNext', this.tuner.name);
    },
    seekForward() {
      this.socket.emit('seekForward', this.tuner.name);
    },
    seekBack() {
      this.socket.emit('seekBack', this.tuner.name);
    },
    toggleInfo() {
      this.socket.emit('info', this.tuner.name);
    },
    toggleAudio() {
      this.socket.emit('audio', this.tuner.name);
    },
  },
};
