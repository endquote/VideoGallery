const EventEmitter = require('events').EventEmitter;

const mongoose = require('mongoose');

class Database {
  static init(url = 'mongodb://localhost/') {
    url += 'videoGallery';
    mongoose.Promise = global.Promise;
    mongoose.connect(url).catch(() => console.error('Database connection failed'));

    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(0);
    Database.on = this.emitter.on.bind(this.emitter);

    const videoSchema = new mongoose.Schema({
      url: {
        required: true,
        type: String,
        index: true,
        unique: true,
      },
      added: Date,
      created: Date,
      author: String,
      title: String,
      description: String,
      loaded: Boolean,
    });

    this.Video = mongoose.model('video', videoSchema);
  }

  // Get all of the videos in the collection.
  static getVideos() {
    return this.Video.find().sort({ added: -1 });
  }

  // Add a video to the collection by URL.
  static addVideo(url) {
    return new this.Video({ url, added: new Date() })
      .save()
      .then(doc => this.emitter.emit('videoAdded', doc))
      .catch((err) => {
        // Already exists, don't care.
        if (err.code !== 11000) {
          throw err;
        }
      });
  }

  // Remove a video from the collection by URL.
  static removeVideo(url) {
    return this.Video.findOneAndRemove({ url })
      .then((doc) => {
        if (doc) {
          this.emitter.emit('videoRemoved', doc);
        }
      });
  }

  static saveVideo(doc) {
    return doc.save()
      .then(this.emitter.emit('videoUpdated', doc));
  }
}

module.exports = Database;
