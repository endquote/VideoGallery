const http = require('superagent');

// Each item in the video list
module.exports = {
  props: ['video', 'channel'],
  template: require('./video-item.html'),
  methods: {
    async removeVideo() {
      if (window.confirm(`Are you sure you want to delete "${this.video.title || this.video.url}"`)) {
        await http.patch('/api/video').send({ id: this.video._id, channel: this.channel });
      }
    },
    selectVideo() {
      if (!this.video.loaded) {
        return;
      }
      this.$emit('video-selected', this.video);
    },
  },
  computed: {
    thumbnail() {
      return this.video.loaded ? `/content/${this.video._id}/thumbnail/` : '/images/spinner.gif';
    },
  },
};

