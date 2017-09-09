const QRious = require('qrious');

// Component which shows the video metadata and QR code.
module.exports = {
  props: ['video', 'showInfo'],
  template: require('./video-info.html'),
  computed: {
    qrcode() {
      return this.video._id ? new QRious({ size: 300, value: this.video.url }).toDataURL() : '';
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
      return value && value.replace ? value.replace(/[\r\n]/g, '<br>') : value;
    },
  },
};
