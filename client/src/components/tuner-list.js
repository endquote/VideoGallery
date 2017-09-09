// List of tuners
module.exports = {
  props: ['tuners', 'tuner'],
  template: require('./tuner-list.html'),
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
};

