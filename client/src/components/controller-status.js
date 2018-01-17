// Component which shows the battery level of a connected controller.
module.exports = {
  props: ['connected', 'battery'],
  template: require('./controller-status.html'),
};
