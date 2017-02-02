const mongoose = require('mongoose');

class Database {
  constructor(url = 'mongodb://localhost/videoGallery') {
    mongoose.connect(url);
    mongoose.Promise = global.Promise;

    this.Video = mongoose.model('video', new mongoose.Schema({
      url: {
        required: true,
        type: String,
        index: true,
        unique: true,
      },
      file: String,
      added: Date,
      created: Date,
      author: String,
      title: String,
      selected: {
        type: Boolean,
        index: true,
      },
    }));
  }

  getVideos() {
    return this.Video.find();
  }

  addVideo(url) {
    return new this.Video({
      url,
      selected: false,
    }).save();
  }

  deleteVideo(url) {
    return this.Video.remove({
      url,
    });
  }

  selectVideo(url) {
    return this.Video.updateMany({
      selected: true,
    }, {
      selected: false,
    }).then(() => {
      this.Video.updateOne({
        url,
      }, {
        selected: true,
      }).exec();
    });
  }
}

module.exports = Database;
