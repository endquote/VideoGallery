const util = require('util');
const EventEmitter = require('events').EventEmitter;

const mongoose = require('mongoose');

class Database {
  constructor(url = 'mongodb://localhost/videoGallery') {
    mongoose.connect(url);
    mongoose.Promise = global.Promise;

    const videoSchema = new mongoose.Schema({
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
        default: false,
      },
    });

    this.Video = mongoose.model('video', videoSchema);
  }

  getVideos() {
    return this.Video.find();
  }

  addVideo(url) {
    return new this.Video({ url, selected: false })
      .save()
      .then((doc) => {
        if (doc) {
          this.emit('videoAdded', doc);
        }
      });
  }

  removeVideo(url) {
    return this.Video.findOneAndRemove({ url })
      .then((doc) => {
        if (doc) {
          this.emit('videoRemoved', doc);
        }
      });
  }

  selectVideo(url) {
    return this.Video.updateMany({ selected: true }, { selected: false })
      .then(() => this.Video.findOneAndUpdate({ url }, { selected: true }, { new: true }))
      .then((doc) => {
        if (doc) {
          this.emit('videoSelected', doc);
        }
      });
  }
}

util.inherits(Database, EventEmitter);

module.exports = Database;
