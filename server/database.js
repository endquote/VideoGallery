const EventEmitter = require('events').EventEmitter;

const mongoose = require('mongoose');

class Database {
  static init(url = 'mongodb://localhost/') {
    mongoose.Promise = global.Promise;
    mongoose
      .connect(url)
      .then(() => console.log('Database connected'))
      .catch(() => console.error('Database connection failed'));

    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(0);
    Database.on = this.emitter.on.bind(this.emitter);

    const invalidChannels = [
      'new',
      'all',
      'admin',
      'images',
      'scripts',
      'styles',
      '_',
    ];
    this.invalidChannels = invalidChannels;

    this.channelSchema = new mongoose.Schema({
      name: {
        type: String,
        default: 'default',
        required: true,
        index: { unique: true },
        validate: {
          validator(v) {
            return invalidChannels.indexOf(v.toLowerCase()) === -1;
          },
        },
      },
    });

    this.videoSchema = new mongoose.Schema({
      url: { required: true, type: String, index: true },
      added: { required: true, type: Date },
      created: { required: false, type: Date },
      author: { required: false, type: String },
      title: { required: false, type: String },
      description: { required: false, type: String },
      loaded: { required: true, type: Boolean, default: false },
      duration: { require: true, type: Number, default: 0 },
      channels: [this.channelSchema],
    });

    this.Video = mongoose.model('video', this.videoSchema);

    return Promise.resolve();
  }

  // Remove any unloaded videos.
  static cleanup() {
    return this.Video.find({ loaded: false }).then((res) => {
      const removes = [];
      res.forEach(v => removes.push(this.removeVideo(v.id)));
      return Promise.all(res);
    });
  }

  // Get the list of channels.
  static getChannels() {
    return this.Video.find().distinct('channels.name').sort();
  }

  // Get all of the videos for a channel.
  static getVideos(channel = null) {
    if (channel === '') {
      channel = null;
    }

    if (channel) {
      return this.Video.find({ 'channels.name': channel });
    }

    return this.Video.find().sort({ added: -1 });
  }

  // Add a video to a channel by URL, returning the new record.
  static addVideo(url, channel = null) {
    if (!url) {
      return Promise.reject('Missing video URL');
    }

    if (channel === '') {
      channel = null;
    }

    if (channel) {
      channel = channel.toLowerCase();
    }

    return this.Video.findOne({ url }).then((existingVideo) => {
      if (!existingVideo) {
        // This is a new video.
        return this.Video
          .create({
            url,
            added: new Date(),
            channels: channel !== null ? [{ name: channel }] : [],
          })
          .then(doc =>
            this.emitter.emit('videoAdded', {
              video: doc,
              channelName: channel,
            }),
          );
      }

      if (channel && !existingVideo.channels.find(c => c.name === channel)) {
        // Add a new channel to an existing video.
        existingVideo.channels.push({ name: channel });
        return this.saveVideo(existingVideo);
      }

      // Add an existing channel to an existing video.
      return Promise.reject('Video was already in that channel');
    });
  }

  // Remove a video from a channel by ID, returning the removed record.
  static removeVideo(id, channel) {
    if (!id) {
      return Promise.reject('Missing video ID');
    }

    if (channel === '') {
      channel = null;
    }

    if (channel) {
      channel = channel.toLowerCase();
    }

    return this.Video.findOne({ _id: id }).then((existingVideo) => {
      if (!existingVideo) {
        // This video doesn't exist.
        return Promise.reject('Video not found');
      }

      if (!channel) {
        // Remove video entirely.
        return this.Video.remove({ _id: id }).then(() =>
          this.emitter.emit('videoRemoved', {
            videoId: id,
            channelName: channel,
          }),
        );
      }

      const channelIndex = existingVideo.channels.findIndex(
        c => c.name === channel,
      );
      if (channelIndex === -1) {
        // This video wasn't in that channel.
        return Promise.reject('That video is not in that channel');
      }

      // Remove a video frmo a channel.
      existingVideo.channels.splice(channelIndex, 1);
      return this.saveVideo(existingVideo);
    });
  }

  // Update a video.
  static saveVideo(videoDoc) {
    return videoDoc
      .save()
      .then(doc => this.emitter.emit('videoUpdated', { video: doc }));
  }
}

module.exports = Database;
