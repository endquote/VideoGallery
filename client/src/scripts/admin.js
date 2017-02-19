const Vue = require('vue');
const VueResource = require('vue-resource');
const io = require('socket.io-client');

Vue.use(VueResource);

class AdminPage {
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

  // Init the root Vue component
  static _buildApp(videos) {
    this.app = new Vue({
      el: '#app',

      data: {
        videos,
        selectedVideo: {},
      },

      components: {

        // Video entry form
        'video-add': {
          methods: {
            submit() {
              this.$http.post('/video', { url: this.$el.getElementsByClassName('video-add-url')[0].value });
            },
          },
        },

        // Each item in the video list
        'video-item': {
          props: ['video', 'selectedVideo'],
          methods: {
            selectVideo() {
              AdminPage.socket.emit('selectVideo', { url: this.video.url });
            },
            removeVideo() {
              this.$http.delete('/video', { body: { url: this.video.url } });
            },
          },
        },
      },
    });
  }

  // Handle updates to the list from the server.
  static _getUpdates(videos) {
    this.socket = io.connect();

    // Add new videos to the beginning of the list.
    this.socket.on('videoAdded', (video) => {
      videos.unshift(video);
    });

    // Remove videos from the list.
    this.socket.on('videoRemoved', (video) => {
      const index = videos.findIndex(v => v.url === video.url);
      if (index === -1) {
        return;
      }
      videos.splice(index, 1);
    });

    // Update the selected video.
    this.socket.on('videoSelected', (video) => {
      this.app.selectedVideo = videos.find(v => v.url === video.url);
    });

    // Update the entire video record.
    this.socket.on('videoUpdated', (video) => {
      const index = videos.findIndex(v => v.url === video.url);
      Vue.set(videos, index, video);
    });
  }
}

module.exports = AdminPage;
