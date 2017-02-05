const Vue = require('vue');
const VueResource = require('vue-resource');

Vue.use(VueResource);

class AdminPage {
  static init() {
    Vue.resource('/videos')
      .get()
      .catch(() => window.alert('Couldn\'t load data. Is the database server running?'))
      .then(res => this._buildApp(res.body));
  }

  static _buildApp(videos) {
    this.app = new Vue({
      el: '#app',
      data: {
        videos,
      },
      components: {
        'video-item': {
          template: '#video-template',
          props: ['video'],
          methods: {
            selectVideo() {
              this.$http.put('/video', { url: this.video.url });
            },
            removeVideo() {
              this.$http.delete('/video', { body: { url: this.video.url } });
            },
          },
        },
      },
    });
  }
}

module.exports = AdminPage;
