const Vue = require('vue');
const VueResource = require('vue-resource');
const io = require('socket.io-client');
const QRious = require('qrious');

Vue.use(VueResource);

class PlayerPage {
  static init() {
    this.knobRate = 1; // Time in seconds to move when the knob turns
    this.doubleTapDelay = 300; // Time in ms to consider a double tap

    Vue.resource('/videos')
      .get()
      .catch(() => window.alert('Couldn\'t load data. Is the database server running?'))
      .then((res) => {
        const videos = res.body;
        videos.forEach((v) => {
          v.played = v.selected;
        });
        this._buildApp(videos);
        this._getUpdates(videos);
      });
  }

  static _buildApp(videos) {
    this.app = new Vue({
      el: '#app',

      data: {
        selectedVideo: videos.find(v => v.selected) || {},
        videos,
        progress: 0,
        showInfo: false,
        playSound: false,
        controllerConnected: false,
        controllerBattery: 0,
      },

      watch: {
        selectedVideo(newValue) {
          newValue.played = true;
          newValue.selected = true;
        },

        playSound(newValue) {
          // TODO: Tween this
          this.$videoNode.volume = newValue ? 1 : 0;
        },
      },

      // Save a reference to the <video> so we don't have to look for it all the time.
      mounted() {
        this.$videoNode = this.$el.getElementsByTagName('video')[0];
      },

      components: {

        'video-player': {
          props: ['video', 'progress'],
          methods: {

            // Set the volume to zero to start.
            onLoadStart() {
              this.$parent.$videoNode.volume = 0;
            },

            // Update the progress bar.
            onTimeUpdate() {
              this.$parent.progress = this.$parent.$videoNode.currentTime / this.$parent.$videoNode.duration;
            },

            onEnded() {
              PlayerPage.nextVideo();
            },
          },
        },

        'video-info': {
          props: ['video', 'showInfo'],
          computed: {
            qrcode() {
              return new QRious({ value: this.video.url }).toDataURL();
            },
          },
        },

        'video-progress': {
          props: ['progress'],
        },

        'controller-status': {
          props: ['connected', 'battery'],
        },

        'click-target': {
          methods: {
            onPointerUp() {
              if (this.$tapTimeout) {
                // Double tap, go to next video
                clearTimeout(this.$tapTimeout);
                this.$tapTimeout = null;
                PlayerPage.nextVideo();
              } else {
                this.$tapTimeout = setTimeout(() => {
                  // Single tap, toggle info
                  this.$tapTimeout = null;
                  if (!this.$parent.showInfo && !this.$parent.playSound) {
                    this.$parent.showInfo = true;
                  } else if (this.$parent.showInfo && !this.$parent.playSound) {
                    this.$parent.playSound = true;
                  } else if (this.$parent.showInfo && this.$parent.playSound) {
                    this.$parent.showInfo = false;
                  } else if (!this.$parent.showInfo && this.$parent.playSound) {
                    this.$parent.playSound = false;
                  }
                }, PlayerPage.doubleTapDelay);
              }
            },
          },
        },
      },
    });
  }

  static _getUpdates(videos) {
    const player = document.getElementsByTagName('video')[0];

    const socket = io.connect();

    // Handle events from the hardware controller.
    socket.on('controller', (data) => {
      if (data.knob === 'clockwise') {
        player.currentTime += this.knobRate;
      } else if (data.knob === 'anticlockwise') {
        player.currentTime -= this.knobRate;
      } else if (data.knob === 'release') {
        document.getElementById('click-target').dispatchEvent(new Event('pointerup'));
      } else if (data.status === 'connected') {
        this.app.controllerConnected = true;
      } else if (data.status === 'disconnected') {
        this.app.controllerConnected = false;
      } else if (data.battery) {
        this.app.controllerBattery = data.battery;
      }
    });

    // Update the selected video
    socket.on('videoSelected', (video) => {
      videos.forEach((v) => {
        v.selected = v._id === video._id;
        if (v.selected) {
          this.app.selectedVideo = v;
        }
      });
    });

    // Get new videos
    socket.on('videoAdded', (video) => {
      videos.push(video);
    });

    // Remove videos
    socket.on('videoRemoved', (video) => {
      const index = videos.findIndex(v => v._id === video._id);
      if (index === -1) {
        return;
      }
      videos.splice(index, 1);
    });

    // Update existing videos
    socket.on('videoUpdated', (video) => {
      const index = videos.findIndex(v => v._id === video._id);
      if (index === -1) {
        return;
      }
      Vue.set(videos, index, video);
      if (video.selected) {
        videos.forEach((v) => {
          v.selected = v._id === video._id;
        });
        this.app.selectedVideo = video;
      }
    });
  }

  // Select another random video
  static nextVideo() {
    let unplayed = this.app.videos.filter(v => !v.played && v.loaded);

    if (!unplayed.length) {
      // All videos played
      this.app.videos.forEach((v) => {
        v.played = false;
      });
      unplayed = this.app.videos.filter(v => !v.played && v.loaded);
    }

    const random = unplayed[Math.floor(Math.random() * unplayed.length)];
    this.app.$http.put('/video', { url: random.url });
  }
}

module.exports = PlayerPage;
