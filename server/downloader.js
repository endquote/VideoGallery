const path = require('path');
const fs = require('fs-extra-promise');
const childProcess = require('child_process');

const Database = require('./database');

class Downloader {
  static init(target) {
    this.target = target || '../downloads';
    this.target = path.resolve(target);

    this._childProcesses = {};

    // https://github.com/rg3/youtube-dl/blob/master/README.md
    this.infoCmd = 'youtube-dl --dump-json --playlist-items 1';
    this.downloadCmd = 'youtube-dl --write-thumbnail --no-progress --playlist-items 1 -o';

    this.thumbnailWidth = 200;

    fs.ensureDirSync(this.target);
    Database.on('videoAdded', doc => this.addVideo(doc));
    Database.on('videoRemoved', doc => this.removeVideo(doc));
  }

  static addVideo(doc) {
    this._childProcesses[doc.id] = [];
    this._getVideoInfo(doc);
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
      if (code === 0) {
        this._onVideoInfo(doc, JSON.parse(ps.stdoutBuffer));
      } else {
        console.warn(ps.stderrBuffer);
        Database.removeVideo(doc.id);
      }
    });
  }

  // Save the video info to the database.
  static _onVideoInfo(doc, info) {
    console.info(`Saving info for ${doc.url}`);
    if (!info) {
      Database.removeVideo(doc.id);
      return;
    }

    // The default behavior of ytdl to download the best audio+video streams is great, but if
    // the a/v formats are incompatible, it merges them to an MKV, which plays back glitchy in
    // Chrome. So figure out the best video format and the best audio format compatible with
    // that. This might be unnecessary in future ytdl versions:
    // https://github.com/rg3/youtube-dl/issues/10226
    const compatSets = [
      ['mp3', 'mp4', 'm4a', 'm4p', 'm4b', 'm4r', 'm4v', 'ismv', 'isma'],
      ['webm'],
    ];
    const bestVideo = info.formats
      .filter(f => f.height !== null)
      .sort((a, b) => a.height - b.height)
      .pop();
    const compatExts = compatSets.filter(s => s.indexOf(bestVideo.ext) !== -1);
    const compatAudio = info.formats
      .filter(f => !f.height && compatExts.indexOf(f.ext) !== -1)
      .sort((a, b) => a.filesize - b.filesize)
      .pop();

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

    Database.saveVideo(doc)
      .then(() => this._downloadVideo(doc, bestVideo, compatAudio))
      .catch(() => {
        this.removeVideo(doc);
      });
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
      if (code === 0) {
        this._onVideoLoaded(doc);
      } else {
        Database.removeVideo(doc.id);
      }
    });
  }

  // Resize the thumbnail image.
  static _onVideoLoaded(doc) {
    const cmd = 'convert';
    const file = path.join(this.target, doc.id, `${doc.id}.jpg`);
    const args = [file, '-resize', this.thumbnailWidth, file];
    const opts = { shell: false };
    const ps = childProcess.spawn(cmd, args, opts);
    this._childProcesses[doc.id].push(ps);
    ps.stdout.on('data', data => console.info(data.toString()));
    ps.stderr.on('data', data => console.warn(data.toString()));
    ps.on('exit', (code) => {
      if (code === 0) {
        this._onResized(doc);
      } else {
        Database.removeVideo(doc.id);
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
  }

  // Kill any download processes and delete any files related to a deleted record.
  static removeVideo(doc) {
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
