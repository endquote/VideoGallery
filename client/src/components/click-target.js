// Component on top of everything, trapping clicks and keypresses to change play mode.
module.exports = {
  template: require('./click-target.html'),

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
};
