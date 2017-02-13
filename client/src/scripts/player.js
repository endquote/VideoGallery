const Vue = require('vue');
const VueResource = require('vue-resource');
const io = require('socket.io-client');
const QRious = require('qrious');

Vue.use(VueResource);

class PlayerPage {
  static init() {
    this.knobRate = 1; // Time in seconds to move when the knob turns
    this.doubleTapDelay = 300; // Time in ms to consider a double tap
    this.hideInfoDelay = 10000; // Time in ms to automatically hide info panel

    Vue.resource('/videos')
      .get()
      .catch(() => window.alert('Couldn\'t load data. Is the database server running?'))
      .then((res) => {
        const videos = res.body;
        this._buildApp(videos);
        this._getUpdates();
      });
  }

  static _buildApp(videos) {
    const hideInfoDelay = this.hideInfoDelay;
    this.app = new Vue({
      el: '#app',

      data: {
        video: videos.find(v => v.selected) || {},
        progress: 0,
        showInfo: false,
        controllerConnected: false,
        controllerBattery: 0,
      },

      watch: {
        showInfo(newValue, oldValue) {
          // TODO: Tween this
          this.$video.volume = newValue ? 1 : 0;

          // Hide the info after a while
          clearTimeout(this.$hideInfoTimeout);
          if (newValue) {
            this.$hideInfoTimeout = setTimeout(() => {
              this.showInfo = false;
            }, hideInfoDelay);
          }
        },
      },

      // Save a reference to the <video> so we don't have to look for it all the time.
      mounted() {
        this.$video = this.$el.getElementsByTagName('video')[0];
      },

      components: {

        'video-player': {
          props: ['video', 'progress'],
          methods: {

            // Set the volume to zero to start.
            onLoadStart() {
              this.$parent.$video.volume = 0;
            },

            // Update the progress bar.
            onTimeUpdate() {
              this.$parent.progress = this.$parent.$video.currentTime / this.$parent.$video.duration;
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
              } else {
                this.$tapTimeout = setTimeout(() => {
                  // Single tap, toggle info
                  this.$tapTimeout = null;
                  this.$parent.showInfo = !this.$parent.showInfo;
                }, this.doubleTapDelay);
              }
            },
          },
        },
      },
    });
  }

  static _getUpdates() {
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

    // Update the selected video.
    socket.on('videoSelected', (video) => {
      this.app.video = video || {};
    });
  }
}

module.exports = PlayerPage;
