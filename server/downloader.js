const path = require('path');
const fs = require('fs-extra-promise');
const childProcess = require('child_process');

const Database = require('./database');

class Downloader {
  static init(target) {
    // Support home folder
    if (target[0] === '~') {
      target = path.join(process.env.HOME, target.slice(1));
    }

    this.target = target || '../downloads';
    this.target = path.resolve(target);

    this._childProcesses = {};

    // The video currently being loaded
    this._adding = null;

    // A queue of additional videos to load
    this._addQueue = [];

    // https://github.com/rg3/youtube-dl/blob/master/README.md
    this.infoCmd = 'youtube-dl --dump-json --playlist-items 1';
    this.downloadCmd = 'youtube-dl --write-thumbnail --no-progress --playlist-items 1 -o';

    this.thumbnailWidth = 600;

    fs.ensureDirSync(this.target);
    Database.on('videoAdded', doc => this.addVideo(doc.video));
    Database.on('videoRemoved', doc => this.removeVideo(doc.video));
  }

  static addVideo(doc) {
    this._addQueue.push(doc);
    this._nextAdd();
  }

  // Queue downloads and do them one at a time.
  static _nextAdd() {
    if (this._adding) {
      return;
    }
    if (!this._addQueue.length) {
      console.info('Downloads complete.');
      return;
    }
    this._adding = this._addQueue.shift();
    this._childProcesses[this._adding.id] = [];
    this._getVideoInfo(this._adding);
  }

  // Spawn a youtube-dl process to get metadata about the video.
  static _getVideoInfo(doc) {
    console.info(`Getting info for ${doc.url}`);
    const cmd = this.infoCmd.split(' ')[0];
    const args = this.infoCmd.split(' ').slice(1);
    args.push(doc.url);
    const opts = { shell: false };
    const ps = childProcess.spawn(cmd, args, opts);
    this._childProcesses[doc.id].push(ps);
    ps.stdoutBuffer = '';
    ps.stderrBuffer = '';
    ps.stdout.on('data', data => (ps.stdoutBuffer += data.toString()));
    ps.stderr.on('data', data => (ps.stderrBuffer += data.toString()));
    ps.on('exit', (code) => {
      if (code === null) {
        return;
      }
      if (code === 0) {
        this._onVideoInfo(doc, JSON.parse(ps.stdoutBuffer));
      } else {
        this._failed(doc, ps.stderrBuffer);
      }
    });
  }

  // Save the video info to the database.
  static _onVideoInfo(doc, info) {
    console.info(`Saving info for ${doc.url}`);
    if (!info) {
      this._failed(doc);
      return;
    }

    // The default behavior of ytdl to download the best audio+video streams is great, but if
    // the a/v formats are incompatible, it merges them to an MKV, which plays back glitchy in
    // Chrome. So figure out the best video format and the best audio format compatible with
    // that. This might be unnecessary in future ytdl versions:
    // https://github.com/rg3/youtube-dl/issues/10226
    const compatSets = [
      ['mp3', 'mp4', 'm4a', 'm4p', 'm4b', 'm4r', 'm4v', 'ismv', 'isma', 'mov'],
      ['webm'],
    ];
    const bestVideo = info.formats
      .filter(f => f.height !== null)
      .sort((a, b) => a.height - b.height)
      .pop();
    const compatExts = compatSets.find(s => s.indexOf(bestVideo.ext) !== -1);
    const compatAudio = compatExts ? info.formats
      .filter(f => !f.height && compatExts.indexOf(f.ext) !== -1)
      .sort((a, b) => a.filesize - b.filesize)
      .pop() : null;

    doc.created = new Date();
    if (info.upload_date) {
      doc.created = new Date(
        parseInt(info.upload_date.substr(0, 4), 10),
        parseInt(info.upload_date.substr(4, 2), 10) - 1,
        parseInt(info.upload_date.substr(6, 2), 10));
    }
    doc.author = info.uploader;
    doc.title = info.title;
    doc.description = info.description;
    doc.url = info.webpage_url;
    doc.duration = info.duration;

    Database.saveVideo(doc)
      .then(() => this._downloadVideo(doc, bestVideo, compatAudio))
      .catch(() => this._failed(doc));
  }

  // Spawn a youtube-dl process to download the video.
  static _downloadVideo(doc, videoFmt, audioFmt) {
    console.info(`Downloading video ${doc.url}`);
    const cmd = this.downloadCmd.split(' ')[0];
    const args = this.downloadCmd.split(' ').slice(1);
    if (videoFmt && audioFmt) {
      args.unshift(`${videoFmt.format_id}+${audioFmt.format_id}`);
      args.unshift('-f');
    }
    args.push(`${this.target}/${doc.id}/${doc.id}`);
    args.push(doc.url);
    const opts = { shell: false };
    const ps = childProcess.spawn(cmd, args, opts);
    this._childProcesses[doc.id].push(ps);
    ps.stdout.on('data', data => console.info(data.toString()));
    ps.stderr.on('data', data => console.warn(data.toString()));
    ps.on('exit', (code) => {
      if (code === null) {
        return;
      }
      if (code === 0) {
        this._onVideoLoaded(doc);
      } else {
        this._failed(doc);
      }
    });
  }

  // Resize the thumbnail image.
  static _onVideoLoaded(doc) {
    const cmd = 'convert';
    const inFile = path.join(this.target, doc.id, `${doc.id}.jpg`);
    const outFile = path.join(this.target, doc.id, `${doc.id}-resized.jpg`);
    const args = [inFile, '-resize', this.thumbnailWidth, outFile];
    const opts = { shell: false };
    const ps = childProcess.spawn(cmd, args, opts);
    this._childProcesses[doc.id].push(ps);
    ps.stdout.on('data', data => console.info(data.toString()));
    ps.stderr.on('data', data => console.warn(data.toString()));
    ps.on('exit', (code) => {
      if (code === null) {
        return;
      }
      if (code === 0) {
        this._onResized(doc);
      } else {
        this._failed(doc);
      }
    });
  }

  // Save that the video has been loaded.
  static _onResized(doc) {
    doc.loaded = true;
    Database.saveVideo(doc);
    if (this._childProcesses[doc.id]) {
      this._childProcesses[doc.id].forEach(p => p.kill());
      delete this._childProcesses[doc.id];
    }
    this._adding = null;
    this._nextAdd();
  }

  static _failed(doc, err) {
    if (err) {
      console.warn(err);
    }
    if (!doc.loaded) {
      this.removeVideo(doc);
    }
    this._adding = null;
    this._nextAdd();
  }

  // Kill any download processes and delete any files related to a deleted record.
  static removeVideo(doc) {
    if (!doc) {
      return;
    }
    console.info(`Deleting video ${doc.url}`);
    if (this._childProcesses[doc.id]) {
      this._childProcesses[doc.id].forEach(p => p.kill());
      delete this._childProcesses[doc.id];
    }
    fs.removeSync(path.join(this.target, doc.id), err => console.warn(err));
    Database.removeVideo(doc.id);
  }
}

module.exports = Downloader;
