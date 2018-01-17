// Component containing the actual <video> tag.
module.exports = {
  props: ['video', 'playSound', 'channel'],
  template: require('./video-player.html'),
  methods: {
    // Set the volume on start.
    onLoadStart() {
      const videoNode = this.$el.getElementsByTagName('video')[0];
      videoNode.volume = this.playSound ? 1 : 0;
    },

    // Update the progress bar.
    onTimeUpdate() {
      const videoNode = this.$el.getElementsByTagName('video')[0];
      this.$emit('progress-changed', videoNode.currentTime / videoNode.duration);
    },

    // Go to the next video when the current one ends.
    onEnded() {
      this.$emit('video-ended');
    },

    onError(err) {
      err = err.target.error;
      if (!err) {
        return;
      }
      const empty = 'MEDIA_ELEMENT_ERROR: Empty src attribute';
      if (err.message === empty) {
        return;
      }
      console.error(err);
      this.$emit('videoError', err);
    },
  },

  watch: {
    playSound(newValue) {
      const videoNode = this.$el.getElementsByTagName('video')[0];
      videoNode.volume = newValue ? 1 : 0;
    },
  },
};
