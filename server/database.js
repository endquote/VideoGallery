const EventEmitter = require('events').EventEmitter;

const mongoose = require('mongoose');
const config = require('config');

class Database {
  static init(url = 'mongodb://localhost/') {
    url += 'rgbtv';
    mongoose.Promise = global.Promise;
    mongoose.connect(url, { useMongoClient: true })
      .then(() => console.log('Database connected'))
      .catch(() => console.error('Database connection failed'));

    this._defaultChannel = config.get('defaultChannel');

    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(0);
    Database.on = this.emitter.on.bind(this.emitter);

    this.videoSchema = new mongoose.Schema({
      url: { required: true, type: String, index: { unique: true, sparse: true } },
      added: { required: true, type: Date },
      created: { required: false, type: Date },
      author: { required: false, type: String },
      title: { required: false, type: String },
      description: { required: false, type: String },
      loaded: { required: true, type: Boolean, default: false },
      duration: { require: true, type: Number, default: 0 },
    });

    this.channelSchema = new mongoose.Schema({
      name: { required: true, type: String, index: { unique: true }, default: 'default' },
      videos: [this.videoSchema],
    });

    this.channels = mongoose.model('channel', this.channelSchema);
  }

  // Called when the server starts.
  static startup() {
    // Delete any videos which previously failed to load.
    this.channels
      .find({ 'videos.loaded': false })
      .then((channels) => {
        channels.forEach((channel) => {
          channel.videos.forEach((video) => {
            this.removeVideo(video.id, channel.name);
          });
        });
      });

    // Create the default channel if it isn't there.
    this.channels.findOne({ name: this._defaultChannel }).then((res) => {
      if (!res) {
        new this.channels().save(); // eslint-disable-line
      }
    });
  }


  // Get all of the videos for a channel.
  static getVideos(channelName = this._defaultChannel) {
    return this.channels
      .findOne({ name: channelName })
      .select('videos')
      .then((res) => {
        res.videos.sort((a, b) => a.added - b.added);
        return res.videos;
      });
  }

  // Add a video to a channel by URL, returning the new record.
  static addVideo(videoUrl, channelName = this._defaultChannel) {
    if (!videoUrl) {
      return Promise.resolve();
    }

    return this.channels
      .findOne({
        name: channelName,
        'videos.url': videoUrl,
      })
      .then((channelDoc) => {
        if (channelDoc) {
          return Promise.resolve();
        }

        return this.channels.findOneAndUpdate({
          name: channelName,
        }, {
          $push: {
            videos: { url: videoUrl, added: new Date() },
          },
        }, {
          new: true,
        }).then((doc) => {
          this.emitter.emit('videoAdded', {
            channelName,
            video: doc.videos.find(v => v.url === videoUrl),
          });
        });
      });
  }

  // Remove a video from a channel by ID, returning the removed record.
  static removeVideo(videoId, channelName = this._defaultChannel) {
    return this.channels
      .update({
        name: channelName,
      }, {
        $pull: {
          videos: {
            _id: videoId,
          },
        },
      })
      .then((res) => {
        if (!res.nModified) {
          return;
        }
        this.emitter.emit('videoRemoved', {
          channel: channelName,
          // TODO: I'd rather actually return the video...
          video: { id: videoId, _id: videoId },
        });
      });
  }

  // Update a video.
  static saveVideo(videoDoc, channelName = this._defaultChannel) {
    // Make a new object which is the video without the id.
    // There's gotta be a better way.
    const update = {};
    Object.keys(this.videoSchema.paths)
      .filter(k => k !== '_id')
      .forEach(k => (update[`videos.$.${k}`] = videoDoc[k]));

    return this.channels
      .findOneAndUpdate({
        name: channelName,
        'videos._id': videoDoc._id,
      }, {
        $set: update,
      }, {
        new: true,
      })
      .then((channelDoc) => {
        this.emitter.emit('videoUpdated', {
          channelName,
          video: channelDoc.videos.find(v => v.id === videoDoc.id),
        });
      });
  }
}

module.exports = Database;
