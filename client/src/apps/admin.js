const Vue = require('vue');
const VueResource = require('vue-resource');
const io = require('socket.io-client');

Vue.use(VueResource);

function parseVideo(video) {
  video.added = new Date(video.added);
  video.created = new Date(video.created);
}

module.exports = new Vue({
  el: '#app',

  data() {
    return {
      channels: [],
      invalidChannels: [],
      videos: [],
      channel: undefined,
      tuner: undefined,
      tuners: [],
      socket: null,
    };
  },

  mounted() {
    this.getUpdates();
    this.channel = null;
  },

  watch: {
    // When the channel changes, get new data.
    channel() {
      Vue.resource(`/api/videos/${this.channel || ''}`)
        .get()
        .catch(() => window.alert("Couldn't load data."))
        .then((res) => {
          const videos = res.body;
          videos.forEach(v => parseVideo(v));
          this.videos = videos;
          return Vue.resource('/api/channels').get();
        })
        .then((res) => {
          const channels = res.body;
          channels.current.sort();
          this.channels = channels.current;
          this.invalidChannels = channels.invalid;
          this.getUpdates();
        });
    },

    tuners(newValue) {
      if (!newValue) {
        return;
      }
      newValue.forEach(
        t => (t.video = this.videos.find(v => v._id === t.video)),
      );
      if (this.tuner) {
        this.tuner = newValue.find(t => t.name === this.tuner.name);
        this.channel = this.tuner.channel;
      }
    },
  },

  methods: {
  // Handle updates to the list from the server.
    getUpdates() {
      if (this.subscribed) {
        return;
      }

      this.subscribed = true;

      this.socket = io.connect();

      // Reload on reconnect, like when new changes are deployed.
      this.socket.on('reconnect', () => window.location.reload(true));

      // Add new videos to the beginning of the list.
      const addVideo = (video) => {
        parseVideo(video);
        if (!this.channel || video.channels.find(c => c.name === this.channel)) {
          this.videos.unshift(video);
          document.getElementsByTagName('input')[0].value = '';
        }
      };

      this.socket.on('videoAdded', ({ video }) => addVideo(video));

      // Remove videos from the list.
      const removeVideo = (videoId) => {
        const index = this.videos.findIndex(v => v._id === videoId);
        if (index === -1) {
          return;
        }
        this.videos.splice(index, 1);
      };

      this.socket.on('videoRemoved', ({ videoId, channel }) => removeVideo(videoId, channel));

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
      });

      this.socket.on('connect', () => this.socket.emit('tunerAdmin'));

      this.socket.on('tunerChanged', (tuners) => {
        const t = [];
        Object.keys(tuners).sort((a, b) => a - b).forEach(k => t.push(tuners[k]));
        this.tuners = t;
      });
    },

    // When the channel-list emits a change event, change the channel.
    onChannelChanged(newChannel) {
      this.channel = newChannel;
      if (this.tuner) {
        const msg = {
          tuner: this.tuner.name,
          channel: this.channel,
          video: null,
        };
        console.info('sending', 'tunerChanged', msg);
        this.socket.emit('tunerChanged', msg);
      }
    },

    onTunerChanged(tuner) {
      this.tuner = tuner;
      if (tuner === null) {
        this.channel = null;
      } else {
        this.channel = tuner.channel;
      }
    },

    onVideoSelected(video) {
      if (!this.tuner) {
        return;
      }
      const msg = {
        tuner: this.tuner.name,
        channel: this.channel,
        video: video._id,
      };
      console.info('sending', 'tunerChanged', msg);
      this.socket.emit('tunerChanged', msg);
    },
  },

  components: {
    // Channel selector
    'channel-list': {
      props: ['channels', 'invalidChannels', 'channel'],
      methods: {
        channelChanged(e) {
          let newChannel =
                e.target.options[e.target.selectedIndex].value || null;
          if (newChannel === 'new') {
            newChannel = window.prompt("What's the name of the new channel?") || '';
            newChannel = newChannel.toLowerCase();
            if (this.invalidChannels.indexOf(newChannel) !== -1) {
              for (let i = 0; i < e.target.options.length; i += 1) {
                if (e.target.options[i].value === this.channel) {
                  e.target.selectedIndex = i;
                  break;
                }
              }
              return alert("That's a lousy name for a channel.");
            }
          }

          return this.$emit('channel-changed', newChannel);
        },
      },
    },

    // List of tuners
    'tuner-list': {
      props: ['tuners', 'tuner'],
      methods: {
        onTunerChanged(e) {
          let tuner = null;
          if (e.target.selectedIndex === 0) {
            tuner = null;
          } else {
            tuner = e.target.options[e.target.selectedIndex].value;
            tuner = this.tuners.find(t => t.name === tuner);
          }
          return this.$emit('tuner-changed', tuner);
        },
      },
    },

    // Playback controls for current tuner
    'tuner-control': {
      props: ['tuner', 'socket'],

      methods: {
        nextVideo() {
          this.socket.emit('tunerNext', this.tuner.name);
        },
        seekForward() {
          this.socket.emit('seekForward', this.tuner.name);
        },
        seekBack() {
          this.socket.emit('seekBack', this.tuner.name);
        },
        toggleInfo() {
          this.socket.emit('info', this.tuner.name);
        },
        toggleAudio() {
          this.socket.emit('audio', this.tuner.name);
        },
      },
    },

    // Video entry form
    'video-add': {
      props: ['channel'],
      methods: {
        submit() {
          const input = document.getElementById('video-add-url').value;
          input.split(',').forEach((url) => {
            Vue.http
              .post('/api/video', { url, channel: this.channel })
              .catch(err => console.warn(err));
          });
        },
      },
    },

    // Each item in the video list
    'video-item': {
      props: ['video', 'channel'],
      methods: {
        removeVideo() {
          if (window.confirm(`Are you sure you want to delete "${this.video.title || this.video.url}"`)) {
            Vue.http.patch('/api/video', {
              id: this.video._id,
              channel: this.channel,
            });
          }
        },
        selectVideo() {
          if (!this.video.loaded) {
            return;
          }
          this.$emit('video-selected', this.video);
        },
      },
      computed: {
        thumbnail() {
          return this.video.loaded ? `/content/${this.video._id}/thumbnail/` : '/images/spinner.gif';
        },
      },
    },
  },
});

