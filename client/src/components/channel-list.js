// Channel selector
module.exports = {
  props: ['channels', 'invalidChannels', 'channel'],
  template: require('./channel-list.html'),
  methods: {
    channelChanged(e) {
      let newChannel = e.target.options[e.target.selectedIndex].value || null;
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
};
