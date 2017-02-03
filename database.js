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

  // Get all of the videos in the collection.
  getVideos() {
    return this.Video.find();
  }

  // Add a video to the collection by URL.
  addVideo(url) {
    return new this.Video({ url, selected: false })
      .save()
      .then((doc) => {
        if (doc) {
          this.emit('videoAdded', doc);
          this.ensureSelection();
        }
      }).catch((err) => {
        // Already exists
        if (err.code !== 11000) {
          throw err;
        }
      });
  }

  // Remove a video from the collection by URL.
  removeVideo(url) {
    return this.Video.findOneAndRemove({ url })
      .then((doc) => {
        if (doc) {
          this.emit('videoRemoved', doc);
          this.ensureSelection();
        }
      });
  }

  // Select a video from the collection by URL.
  selectVideo(url) {
    return this.Video.updateMany({ selected: true }, { selected: false })
      .then(() => this.Video.findOneAndUpdate({ url }, { selected: true }, { new: true }))
      .then((doc) => {
        this.emit('videoSelected', doc);
      });
  }

  // Get the currently selected video.
  selectedVideo() {
    return this.Video.findOne({ selected: true });
  }

  // Make sure a video is selected, doesn't matter which.
  ensureSelection() {
    this.selectedVideo().then((selectedDoc) => {
      if (selectedDoc) {
        return;
      }
      this.Video.findOne().then((doc) => {
        if (doc) {
          this.selectVideo(doc.url);
        } else {
          this.emit('videoSelected', null);
        }
      });
    });
  }
}

util.inherits(Database, EventEmitter);

module.exports = Database;
