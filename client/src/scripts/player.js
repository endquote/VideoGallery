const Vue = require('vue');
const VueResource = require('vue-resource');
const io = require('socket.io-client');
const QRious = require('qrious');

Vue.use(VueResource);

class PlayerPage {
  static init() {
    this.knobRate = 1; // Time in seconds to move when the knob turns
    this.doubleTapDelay = 300; // Time in ms to consider a double tap

    PlayerPage.app = PlayerPage.buildApp();
    PlayerPage.parseLocation();
    document.body.style.visibility = 'visible';
    window.addEventListener('popstate', PlayerPage.parseLocation);
  }

  static parseLocation() {
    const parts = document.location.pathname.toLowerCase().split('/').slice(1);
    PlayerPage.app.tuner = parts.shift() || null;
    PlayerPage.app.channel = parts.shift() || null;
    PlayerPage.app.video = parts.shift() || null;
  }

  static parseVideo(video) {
    video.added = new Date(video.added);
    video.created = new Date(video.created);
  }

  static buildApp() {
    return new Vue({
      el: '#app',

      data() {
        return {
          tuner: undefined,
          video: undefined,
          videos: [],
          channel: undefined,
          progress: 0,
          showInfo: false,
          playSound: false,
          controllerConnected: false,
          controllerBattery: 0,
        };
      },

      watch: {
        channel() {
          console.info(`Getting videos for ${this.channel}`);
          Vue.resource(`/api/videos/${this.channel || ''}`)
            .get()
            .catch(() => window.alert('Couldn\'t load data.'))
            .then((res) => {
              const videos = res.body;
              videos.forEach(v => PlayerPage.parseVideo(v));
              this.videos = videos;
              this.video = this.videos.find(v => v._id === this.video);

              if (!PlayerPage.subscribed) {
                PlayerPage.getUpdates();
              } else if (!this.video) {
                this.nextVideo();
              }
            });
        },

        video(newValue) {
          if (!newValue) {
            this.video = null;
            this.playSound = false;
            this.showInfo = false;
            this.progress = 0;
          } else if (typeof newValue === 'object') {
            newValue.played = true;
          }

          const tuner = this.tuner ? this.tuner : '';
          const channel = this.channel ? this.channel : '';
          let video = this.video;
          if (!video) {
            video = '';
          } else if (typeof this.video === 'object') {
            video = video._id;
          }

          const state = `${document.location.protocol}//${document.location.host}/${tuner}/${channel}/${video}`;
          history.pushState(null, '', state);
        },
      },

      methods: {
        // Select another random video
        nextVideo() {
          if (!this.videos.length) {
            if (this.video) {
              const msg = {
                tuner: this.tuner,
                channel: this.channel,
                video: null,
              };
              console.info('sending', 'tunerChanged', msg);
              PlayerPage.socket.emit('tunerChanged', msg);
            }
            return;
          }

          let unplayed = this.videos.filter(v => !v.played && v.loaded);

          if (unplayed.length === 0) {
            // All videos played
            this.videos.forEach(v => (v.played = false));
            if (this.videos.length > 1) {
              unplayed = this.videos.filter(v => !v.played && v.loaded && v._id !== this.video._id);
            } else {
              unplayed = this.videos.filter(v => !v.played && v.loaded);
            }
          }

          const random = unplayed[Math.floor(Math.random() * unplayed.length)];
          const msg = {
            tuner: this.tuner,
            channel: this.channel,
            video: random ? random._id : null,
          };
          console.info('sending', 'tunerChanged', msg);
          PlayerPage.socket.emit('tunerChanged', msg);
        },

        onProgressChanged(progress) {
          this.progress = progress;
        },

        // Cycle through every combination of info/audio.
        onPlayModeChanged() {
          if (!this.video || !this.videos.length) {
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

        onVideoEnded() {
          this.nextVideo();
        },

        onNextRequested() {
          this.nextVideo();
        },
      },

      components: {

        // Component containing the actual <video> tag.
        'video-player': {
          props: ['video', 'playSound', 'channel'],
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
                this.$emit('next-requested');
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

  static getUpdates() {
    PlayerPage.subscribed = true;

    const app = PlayerPage.app;

    this.socket = io.connect();

    // Reload on reconnect, like when new changes are deployed.
    this.socket.on('reconnect', () => window.location.reload(true));

    this.socket.on('connect', () => {
      const msg = {
        tuner: app.tuner,
        channel: app.channel,
        video: app.video ? app.video._id : null,
      };
      console.info('sending', 'tunerOn', msg);
      this.socket.emit('tunerOn', msg);
    });

    // Update the selected video
    this.socket.on('tunerChanged', ({ channel, video }) => {
      console.info('receiving', 'tunerChanged', channel, video);
      if (channel !== app.channel) {
        app.video = video;
        app.channel = channel;
        return;
      }
      app.video = app.videos.find(v => v._id === video) || null;
      if (!app.video) {
        app.nextVideo();
      }
    });

    // Add new videos to the beginning of the list.
    function addVideo(video) {
      PlayerPage.parseVideo(video);
      if (!app.channel || video.channels.find(c => c.name === app.channel)) {
        app.videos.unshift(video);
      }
    }

    this.socket.on('videoAdded', ({ video }) => addVideo(video));

    // Remove videos from the list.
    function removeVideo(videoId) {
      const index = app.videos.findIndex(v => v._id === videoId);
      if (index === -1) {
        return;
      }
      app.videos.splice(index, 1);
      if (app.video._id === videoId) {
        app.nextVideo();
      }
    }

    this.socket.on('videoRemoved', ({ videoId, channel }) => removeVideo(videoId, channel));

    // Update the entire video record.
    this.socket.on('videoUpdated', ({ video }) => {
      PlayerPage.parseVideo(video);
      const index = app.videos.findIndex(v => v._id === video._id);
      const inChannel = !app.channel || video.channels.find(c => c.name === app.channel);
      if (index !== -1 && inChannel) {
        // Video properties changed
        Vue.set(app.videos, index, video);
      } else if (index === -1 && inChannel) {
        // Video was added to this channel
        addVideo(video);
      } else if (index !== -1 && !inChannel) {
        // Video was removed from this channel
        removeVideo(video._id);
      }

      // If a video was loaded and nothing is selected, select the new one
      if (video.loaded && !app.video) {
        app.nextVideo();
      }
    });

    // Handle events from the hardware controller.
    const player = document.getElementsByTagName('video')[0];
    this.socket.on('controller', (data) => {
      if (data.knob === 'seekForward') {
        player.currentTime += this.knobRate;
      } else if (data.knob === 'seekBack') {
        player.currentTime -= this.knobRate;
      } else if (data.knob === 'nextMode') {
        document.getElementById('click-target').dispatchEvent(new Event('pointerup'));
      } else if (data.status === 'connected') {
        app.controllerConnected = true;
      } else if (data.status === 'disconnected') {
        app.controllerConnected = false;
      } else if (data.battery) {
        app.controllerBattery = data.battery;
      }
    });
  }
}

module.exports = PlayerPage;
