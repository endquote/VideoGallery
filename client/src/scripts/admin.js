const Vue = require('vue');
const VueResource = require('vue-resource');
const io = require('socket.io-client');

Vue.use(VueResource);

class AdminPage {
  static init() {
    this._channelName = document.location.pathname.toLowerCase().split('/')[1];
    if (this._channelName === 'admin') {
      this._channelName = 'default';
    }

    Vue.resource(`/${this._channelName}/api/videos`)
      .get()
      .catch(() => window.alert('Couldn\'t load data. Is the database server running?'))
      .then((res) => {
        const videos = res.body;
        this._buildApp(videos);
        this._getUpdates(videos);
      });
  }

  static _parseVideo(video) {
    video.added = new Date(video.added);
    video.created = new Date(video.created);
  }

  // Init the root Vue component
  static _buildApp(videos) {
    videos.forEach(v => this._parseVideo(v));

    this.app = new Vue({
      el: '#app',

      data: {
        videos,
        selectedVideo: {},
        channelName: this._channelName,
      },

      components: {

        // Video entry form
        'video-add': {
          props: ['channelName'],
          methods: {
            submit() {
              const input = this.$el.getElementsByClassName('video-add-url')[0].value;
              input.split(',').forEach((url) => {
                Vue.http
                  .post(`/${this.channelName}/api/video`, { url })
                  .catch(() => false); // Video already added. Alert?
              });
            },
          },
        },

        // Each item in the video list
        'video-item': {
          props: ['video', 'selectedVideo', 'channelName'],
          methods: {
            selectVideo() {
              if (!this.video.loaded) {
                return;
              }
              AdminPage.socket.emit('selectVideo', { videoId: this.video._id, channelName: this.channelName });
            },
            removeVideo() {
              if (window.confirm(`Are you sure you want to delete "${this.video.title || this.video.url}"`)) {
                Vue.http.delete(`/${this.channelName}/api/video/${this.video._id}`);
              }
            },
          },
          computed: {
            thumbnail() {
              return this.video.loaded ? `/${this.channelName}/content/thumbnail/${this.video._id}` : '/images/spinner.gif';
            },
          },
          watch: {
            selectedVideo(val) {
              if (val === this.video) {
                this.$el.scrollIntoView();
              }
            },
          },
        },
      },
    });
  }

  // Handle updates to the list from the server.
  static _getUpdates(videos) {
    this.socket = io.connect();
    this.socket.on('connect', () => this.socket.emit('joinChannel', this._channelName));

    // Reload on reconnect, like when new changes are deployed.
    this.socket.on('reconnect', () => window.location.reload(true));

    // Add new videos to the beginning of the list.
    this.socket.on('videoAdded', (video) => {
      this._parseVideo(video);
      videos.unshift(video);
      document.getElementsByTagName('input')[0].value = '';
    });

    // Remove videos from the list.
    this.socket.on('videoRemoved', (video) => {
      const index = videos.findIndex(v => v._id === video._id);
      if (index === -1) {
        return;
      }
      videos.splice(index, 1);
    });

    // Update the selected video.
    this.socket.on('videoSelected', (videoId) => {
      if (videoId) {
        const newVideo = videos.find(v => v._id === videoId);
        this.app.selectedVideo = newVideo;
      }
    });

    // Update the entire video record.
    this.socket.on('videoUpdated', (video) => {
      const index = videos.findIndex(v => v._id === video._id);
      this._parseVideo(video);
      Vue.set(videos, index, video);
    });
  }
}

module.exports = AdminPage;
