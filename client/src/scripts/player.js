const Vue = require('vue');
const VueResource = require('vue-resource');
const io = require('socket.io-client');

Vue.use(VueResource);

class PlayerPage {
  static init() {
    Vue.resource('/videos')
      .get()
      .catch(() => window.alert('Couldn\'t load data. Is the database server running?'))
      .then((res) => {
        const videos = res.body;
        this._buildApp(videos);
        this._getUpdates(videos);
      });
  }

  static _buildApp(videos) {

    this.app = new Vue({
      el: '#app',

      data: {
        video: videos.find(v => v.selected) || {},
      },

      components: {

        'video-player': {
          props: ['video'],
        },

        'video-info': {
          props: ['video'],
        },
      },
    });
  }

  static _getUpdates(videos) {
    const socket = io.connect();
    socket.on('controller', (data) => {
      console.log(data);
    });

    // Update the selected video.
    socket.on('videoSelected', (video) => {
      this.app.video = video || {};
    });
  }
}

module.exports = PlayerPage;
