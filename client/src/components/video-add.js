const http = require('superagent');

// Video entry form
module.exports = {
  props: ['channel'],
  template: require('./video-add.html'),
  methods: {
    submit() {
      const input = document.getElementById('video-add-url').value;
      input.split(',').forEach((url) => {
        http.post('/api/video').send({ url, channel: this.channel })
          .catch(err => console.warn(err));
      });
    },
  },
};
