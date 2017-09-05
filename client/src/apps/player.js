const Vue = require('vue');
const VueResource = require('vue-resource');
const io = require('socket.io-client');
const QRious = require('qrious');

Vue.use(VueResource);

function parseVideo(video) {
  video.added = new Date(video.added);
  video.created = new Date(video.created);
}

module.exports = new Vue({
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
  mounted() {
    this.knobRate = 1; // Time in seconds to move when the knob turns
    this.doubleTapDelay = 300; // Time in ms to consider a double tap

    this.parseLocation();
    window.addEventListener('popstate', this.parseLocation);
  },
  watch: {
    channel() {
      console.info(`Getting videos for ${this.channel}`);
      Vue.resource(`/api/videos/${this.channel || ''}`)
        .get()
        .catch(() => window.alert("Couldn't load data."))
        .then((res) => {
          const videos = res.body;
          videos.forEach(v => parseVideo(v));
          this.videos = videos;
          this.video = this.videos.find(v => v._id === this.video);

          if (!this.subscribed) {
            this.getUpdates();
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
    parseLocation() {
      const parts = document.location.pathname.toLowerCase().split('/').slice(1);
      this.tuner = parts.shift() || null;
      this.channel = parts.shift() || null;
      this.video = parts.shift() || null;
    },

    getUpdates() {
      this.subscribed = true;

      this.socket = io.connect();

      // Reload on reconnect, like when new changes are deployed.
      this.socket.on('reconnect', () => window.location.reload(true));

      this.socket.on('connect', () => {
        const msg = {
          tuner: this.tuner,
          channel: this.channel,
          video: this.video ? this.video._id : null,
        };
        console.info('sending', 'tunerOn', msg);
        this.socket.emit('tunerOn', msg);
      });

      // Update the selected video
      this.socket.on('tunerChanged', ({ channel, video, info, audio }) => {
        console.info('receiving', 'tunerChanged', channel, video, info, audio);
        if (channel !== this.channel) {
          this.video = video;
          this.channel = channel;
          return;
        }
        this.showInfo = info;
        this.playSound = audio;
        this.video = this.videos.find(v => v._id === video) || null;
        if (!this.video) {
          this.nextVideo();
        }
      });

      // Add new videos to the beginning of the list.
      function addVideo(video) {
        parseVideo(video);
        if (!this.channel || video.channels.find(c => c.name === this.channel)) {
          this.videos.unshift(video);
        }
      }

      this.socket.on('videoAdded', ({ video }) => addVideo(video));

      // Remove videos from the list.
      function removeVideo(videoId) {
        const index = this.videos.findIndex(v => v._id === videoId);
        if (index === -1) {
          return;
        }
        this.videos.splice(index, 1);
        if (this.video._id === videoId) {
          this.nextVideo();
        }
      }

      this.socket.on('videoRemoved', ({ videoId, channel }) =>
        removeVideo(videoId, channel),
      );

      // Update the entire video record.
      this.socket.on('videoUpdated', ({ video }) => {
        parseVideo(video);
        const index = this.videos.findIndex(v => v._id === video._id);
        const inChannel =
          !this.channel || video.channels.find(c => c.name === this.channel);
        if (index !== -1 && inChannel) {
          // Video properties changed
          Vue.set(this.videos, index, video);
        } else if (index === -1 && inChannel) {
          // Video was added to this channel
          addVideo(video);
        } else if (index !== -1 && !inChannel) {
          // Video was removed from this channel
          removeVideo(video._id);
        }

        // If a video was loaded and nothing is selected, select the new one
        if (video.loaded && !this.video) {
          this.nextVideo();
        }
      });

      this.socket.on('nextVideo', () => this.nextVideo());

      const player = document.getElementsByTagName('video')[0];

      this.socket.on('seekForward', () => (player.currentTime += this.knobRate));
      this.socket.on('seekBack', () => (player.currentTime -= this.knobRate));
      this.socket.on('nextMode', () =>
        document
          .getElementById('click-target')
          .dispatchEvent(new Event('pointerup')),
      );

      // Handle events from the hardware controller.
      this.socket.on('controller', ({ connected, battery }) => {
        this.controllerConnected = connected;
        this.controllerBattery = battery;
      });
    },


    // Select another random video
    nextVideo() {
      const msg = {
        tuner: this.tuner,
        channel: this.channel,
        video: null,
        audio: this.playSound,
        info: this.showInfo,
      };
      if (!this.videos.length) {
        if (this.video) {
          console.info('sending', 'tunerChanged', msg);
          this.socket.emit('tunerChanged', msg);
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
      msg.video = random ? random._id : null;
      console.info('sending', 'tunerChanged', msg);
      this.socket.emit('tunerChanged', msg);
    },

    onProgressChanged(progress) {
      this.progress = progress;
    },

    // Cycle through every combination of info/audio.
    onPlayModeChanged() {
      if (!this.video || !this.videos.length) {
        return;
      }
      let showInfo = this.showInfo;
      let playSound = this.playSound;
      if (!showInfo && !playSound) {
        showInfo = true;
      } else if (showInfo && !playSound) {
        playSound = true;
      } else if (showInfo && playSound) {
        showInfo = false;
      } else if (!showInfo && playSound) {
        playSound = false;
      }
      const msg = {
        tuner: this.tuner,
        channel: this.channel,
        video: this.video._id,
        audio: playSound,
        info: showInfo,
      };
      console.info('sending', 'tunerChanged', msg);
      this.socket.emit('tunerChanged', msg);
    },

    onVideoEnded() {
      this.nextVideo();
    },

    onNextRequested() {
      this.nextVideo();
    },

    onVideoError() {
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
          this.$emit('videoError', err);
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
          return this.video._id
            ? new QRious({ size: 300, value: this.video.url }).toDataURL()
            : '';
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
          return value && value.replace
            ? value.replace(/[\r\n]/g, '<br>')
            : value;
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
            }, this.doubleTapDelay);
          }
        },
      },
    },
  },
});
