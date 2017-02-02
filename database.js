const mongoose = require('mongoose');

class Database {
  constructor(url = 'mongodb://localhost/videoGallery') {
    mongoose.connect(url);
    mongoose.Promise = global.Promise;

    this.Video = mongoose.model('video', new mongoose.Schema({
      url: String,
      file: String,
      added: Date,
      created: Date,
      author: String,
      title: String,
    }));
  }

  getVideos() {
    return this.Video.find();
  }
}

module.exports = Database;
