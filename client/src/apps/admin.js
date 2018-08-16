const Vue = require('vue');
const io = require('socket.io-client');
const http = require('superagent');
const Help = require('../common/help');

Vue.component('channel-list', require('../components/channel-list'));
Vue.component('tuner-list', require('../components/tuner-list'));
Vue.component('tuner-control', require('../components/tuner-control'));
Vue.component('video-item', require('../components/video-item'));
Vue.component('video-add', require('../components/video-add'));

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
      http.get(`/api/videos/${this.channel || ''}`)
        .catch(() => window.alert("Couldn't load data."))
        .then((res) => {
          const videos = res.body;
          videos.forEach(v => Help.parseVideo(v));
          this.videos = videos;
          return http.get('/api/channels');
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
        Help.parseVideo(video);
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
        Help.parseVideo(video);
        const index = this.videos.findIndex(v => v._id === video._id);
        const inChannel = !this.channel || video.channels.find(c => c.name === this.channel);
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
});
