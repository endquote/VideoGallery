const Vue = require('vue');
const VueResource = require('vue-resource');
const io = require('socket.io-client');
const QRious = require('qrious');

Vue.use(VueResource);

class PlayerPage {
  static init() {
    this.knobRate = 1; // Time in seconds to move when the knob turns
    this.doubleTapDelay = 300; // Time in ms to consider a double tap

    // Get the list of videos
    Vue.resource('/videos')
      .get()
      .catch(() => window.alert('Couldn\'t load data. Is the database server running?'))
      .then((res) => {
        const videos = res.body;
        this._buildApp(videos);
        this._getUpdates(videos);
        this.nextVideo();
      });
  }

  static _buildApp(videos) {
    PlayerPage.app = new Vue({
      el: '#app',

      data: {
        selectedVideo: {},
        videos,
        progress: 0,
        showInfo: false,
        playSound: false,
        controllerConnected: false,
        controllerBattery: 0,
      },

      watch: {
        selectedVideo(newValue) {
          if (!newValue) {
            this.selectedVideo = {};
            return;
          }
          newValue.played = true;
        },
      },

      methods: {
        onProgressChanged(progress) {
          this.progress = progress;
        },

        // Cycle through every combination of info/audio.
        onPlayModeChanged() {
          if (!this.showInfo && !this.playSound) {
            this.showInfo = true;
          } else if (this.showInfo && !this.playSound) {
            this.playSound = true;
          } else if (this.showInfo && this.playSound) {
            this.showInfo = false;
          } else if (!this.showInfo && this.playSound) {
            this.playSound = false;
          }
        },
      },

      components: {

        // Component containing the actual <video> tag.
        'video-player': {
          props: ['video', 'playSound'],
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
              PlayerPage.nextVideo();
            },
          },

          watch: {
            playSound(newValue) {
              const videoNode = this.$el.getElementsByTagName('video')[0];
              videoNode.volume = newValue ? 1 : 0;
            },
          },
        },

        // Component which shows the video metadata and QR code.
        'video-info': {
          props: ['video', 'showInfo'],
          computed: {
            qrcode() {
              return this.video._id ? new QRious({ value: this.video.url }).toDataURL() : '';
            },
          },
          filters: {
            linebreak(value) {
              return value && value.replace ? value.replace(/[\r\n]/g, '<br>') : value;
            },
          },

        },

        // Component which shows a progress bar.
        'video-progress': {
          props: ['progress'],
        },

        // Component which shows the battery level of a connected controller.
        'controller-status': {
          props: ['connected', 'battery'],
        },

        // Component on top of everything, trapping clicks and keypresses to change play mode.
        'click-target': {
          mounted() {
            document.getElementById('click-target').focus();
          },

          methods: {
            onKeyPress() {
              this.$emit('play-mode-changed');
            },

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
                  this.$emit('play-mode-changed');
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

    this.videoSocket = io.connect();
    this.controllerSocket = io.connect('http://localhost:8181');

    // Handle events from the hardware controller.
    this.controllerSocket.on('controller', (data) => {
      if (data.knob === 'seekForward') {
        player.currentTime += this.knobRate;
      } else if (data.knob === 'seekBack') {
        player.currentTime -= this.knobRate;
      } else if (data.knob === 'nextMode') {
        document.getElementById('click-target').dispatchEvent(new Event('pointerup'));
      } else if (data.status === 'connected') {
        PlayerPage.app.controllerConnected = true;
      } else if (data.status === 'disconnected') {
        PlayerPage.app.controllerConnected = false;
      } else if (data.battery) {
        PlayerPage.app.controllerBattery = data.battery;
      }
    });

    // Update the selected video
    this.videoSocket.on('videoSelected', (video) => {
      if (!video) {
        PlayerPage.app.selectedVideo = null;
        return;
      }

      if (PlayerPage.app.selectedVideo && PlayerPage.app.selectedVideo._id && PlayerPage.app.selectedVideo._id === video._id) {
        // If it's the same video (like if there's only one video in the list), just replay
        document.getElementsByTagName('video')[0].currentTime = 0;
        document.getElementsByTagName('video')[0].play();
        return;
      }

      PlayerPage.app.selectedVideo = videos.find(v => v._id === video._id);
    });

    // Get new videos
    this.videoSocket.on('videoAdded', (video) => {
      videos.push(video);
    });

    // Remove videos
    this.videoSocket.on('videoRemoved', (video) => {
      const index = videos.findIndex(v => v._id === video._id);
      if (index !== -1) {
        videos.splice(index, 1);
      }
      if (PlayerPage.app.selectedVideo._id === video._id) {
        PlayerPage.nextVideo();
      }
    });

    // Update existing videos
    this.videoSocket.on('videoUpdated', (video) => {
      const index = videos.findIndex(v => v._id === video._id);
      if (index === -1) {
        return;
      }
      Vue.set(videos, index, video);

      // If a video was loaded and nothing is selected, select the new one
      if (video.selected || (video.loaded && !PlayerPage.app.selectedVideo._id)) {
        this.videoSocket.emit('selectVideo', { _id: video._id });
      }
    });
  }

  // Select another random video
  static nextVideo() {
    if (!PlayerPage.app.videos.length) {
      this.videoSocket.emit('selectVideo', null);
      return;
    }

    let unplayed = PlayerPage.app.videos.filter(v => !v.played && v.loaded);

    if (unplayed.length === 0) {
      // All videos played
      PlayerPage.app.videos.forEach((v) => {
        v.played = false;
      });
      unplayed = PlayerPage.app.videos.filter(v => !v.played && v.loaded);
    }

    const random = unplayed[Math.floor(Math.random() * unplayed.length)];
    this.videoSocket.emit('selectVideo', { _id: random._id });
  }
}

module.exports = PlayerPage;
