const Vue = require('vue');
const VueResource = require('vue-resource');
const io = require('socket.io-client');
const QRious = require('qrious');

Vue.use(VueResource);

class PlayerPage {
  static init() {
    this.knobRate = 1; // Time in seconds to move when the knob turns
    this.doubleTapDelay = 300; // Time in ms to consider a double tap

    this._channelName = document.location.pathname.split('/')[1] || 'default';

    // Get the list of videos
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

  static _buildApp(videos) {
    videos.forEach(v => this._parseVideo(v));

    PlayerPage.app = new Vue({
      el: '#app',

      data: {
        selectedVideo: null,
        videos,
        channelName: this._channelName,
        progress: 0,
        showInfo: false,
        playSound: false,
        controllerConnected: false,
        controllerBattery: 0,
      },

      watch: {
        selectedVideo(newValue) {
          if (!newValue) {
            this.selectedVideo = null;
            this.playSound = false;
            this.showInfo = false;
            this.progress = 0;
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
          if (!this.selectedVideo || !this.videos.length) {
            return;
          }
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
          props: ['video', 'playSound', 'channelName'],
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
              return this.video._id ? new QRious({ size: 300, value: this.video.url }).toDataURL() : '';
            },
            createdDate() {
              if (!this.video || !this.video.created) {
                return '';
              }
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              return `${months[this.video.created.getMonth()]} ${this.video.created.getDate()}, ${this.video.created.getFullYear()} - `;
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
    this.videoSocket.on('connect', () => this.videoSocket.emit('joinChannel', this._channelName));

    // Some tuner has to pick the first video.
    this.videoSocket.on('connect', () => {
      this.selectFirstVideo = setTimeout(this.nextVideo.bind(this), 1000);
    });

    // Reload on reconnect, like when new changes are deployed.
    this.videoSocket.on('reconnect', () => {
      window.location.reload(true);
    });

    // Update the selected video
    this.videoSocket.on('videoSelected', (videoId) => {
      if (!videoId) {
        PlayerPage.app.selectedVideo = null;
        return;
      }

      clearTimeout(this.selectFirstVideo);

      const next = videos.find(v => v._id === videoId);
      if (PlayerPage.app.selectedVideo === next) {
        // If it's the same video (like if there's only one video in the list), just replay
        player.currentTime = 0;
        player.play();
      } else {
        PlayerPage.app.selectedVideo = next;
      }
    });

    // Get new videos
    this.videoSocket.on('videoAdded', (video) => {
      this._parseVideo(video);
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
      this._parseVideo(video);
      Vue.set(videos, index, video);

      // If a video was loaded and nothing is selected, select the new one
      if (video.loaded && !PlayerPage.app.selectedVideo) {
        this.videoSocket.emit('selectVideo', { channelName: this._channelName, videoId: video._id });
      }
    });

    // Change the channel.
    this.videoSocket.on('changeChannel', (channel) => {
      window.location = channel === 'default' ? '/' : `/${channel}/`;
    });

    this.controllerSocket = io.connect('http://localhost:8181', { reconnectionAttempts: 5 });

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
  }

  // Select another random video
  static nextVideo() {
    if (!PlayerPage.app.videos.length) {
      this.videoSocket.emit('selectVideo', { channelName: this._channelName, videoId: null });
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
    this.videoSocket.emit('selectVideo', { channelName: this._channelName, videoId: random._id });
  }
}

module.exports = PlayerPage;
