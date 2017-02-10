const Vue = require('vue');
const VueResource = require('vue-resource');
const io = require('socket.io-client');

Vue.use(VueResource);

class PlayerPage {
  static init() {
    const socket = io.connect();
    socket.on('controller', (data) => {
      console.log(data);
    });
  }
}

module.exports = PlayerPage;
