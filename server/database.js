const EventEmitter = require('events').EventEmitter;

const mongoose = require('mongoose');

class Database {
  static init(url = 'mongodb://localhost/') {
    url += 'videoGallery';
    mongoose.Promise = global.Promise;
    mongoose.connect(url, { useMongoClient: true })
      .then(() => console.log('Database connected'))
      .catch(() => console.error('Database connection failed'));

    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(0);
    Database.on = this.emitter.on.bind(this.emitter);

    const videoSchema = new mongoose.Schema({
      url: { required: true, type: String, index: true, unique: true },
      added: { required: true, type: Date },
      created: { required: false, type: Date },
      author: { required: false, type: String },
      title: { required: false, type: String },
      description: { required: false, type: String },
      loaded: { required: true, type: Boolean, default: false },
    });

    this.Video = mongoose.model('video', videoSchema);
  }

  // On startup, delete any videos which previously failed to load.
  static cleanup() {
    this.Video
      .find({ loaded: false })
      .then(docs => docs.forEach(d => this.removeVideo(d.id)));
  }

  // Get all of the videos in the collection.
  static getVideos() {
    return this.Video.find().sort({ added: -1 });
  }

  // Add a video to the collection by URL.
  static addVideo(url) {
    return new this.Video({ url, added: new Date() })
      .save()
      .then(doc => this.emitter.emit('videoAdded', doc));
  }

  // Remove a video from the collection by URL.
  static removeVideo(id) {
    return this.Video.findOneAndRemove({ _id: id })
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
