const path = require('path');
const fs = require('fs-extra-promise');
const childProcess = require('child_process');

const Database = require('./database');

class Downloader {
  static init(target) {
    this.target = target || '../downloads';
    this.target = path.resolve(target);

    this._infoProcs = {};
    this._downloadProcs = {};
    this._resizeProcs = {};

    // https://github.com/rg3/youtube-dl/blob/master/README.md
    this.infoCmd = 'youtube-dl --dump-json --playlist-items 1';
    this.downloadCmd = 'youtube-dl --write-thumbnail --no-progress --playlist-items 1 -o';

    this.thumbnailWidth = 200;

    fs.ensureDirSync(this.target);
    Database.on('videoAdded', doc => this.addVideo(doc));
    Database.on('videoRemoved', doc => this.removeVideo(doc));
  }

  static addVideo(doc) {
    this._getVideoInfo(doc);
  }

  // Spawn a youtube-dl process to get metadata about the video.
  static _getVideoInfo(doc) {
    console.info(`Getting info for ${doc.url}`);
    const cmd = this.infoCmd.split(' ')[0];
    const args = this.infoCmd.split(' ').slice(1);
    args.push(doc.url);
    const opts = { shell: false };
    const ps = this._infoProcs[doc.id] = childProcess.spawn(cmd, args, opts);
    ps.stdoutBuffer = '';
    ps.stderrBuffer = '';
    ps.stdout.on('data', data => (ps.stdoutBuffer += data.toString()));
    ps.stderr.on('data', data => (ps.stderrBuffer += data.toString()));
    ps.on('exit', (code) => {
      if (code === 0) {
        this._onVideoInfo(doc, JSON.parse(ps.stdoutBuffer));
      } else {
        console.warn(ps.stderrBuffer);
        Database.removeVideo(doc.url);
      }
      delete this._infoProcs[doc.id];
    });
  }

  // Save the video info to the database.
  static _onVideoInfo(doc, info) {
    console.info(`Saving info for ${doc.url}`);
    if (!info || !info.upload_date) {
      Database.removeVideo(doc.url);
      return;
    }

    doc.created = new Date(
      parseInt(info.upload_date.substr(0, 4), 10),
      parseInt(info.upload_date.substr(4, 2), 10) - 1,
      parseInt(info.upload_date.substr(6, 2), 10));
    doc.author = info.uploader;
    doc.title = info.title;
    doc.description = info.description;
    doc.url = info.webpage_url;
    Database.saveVideo(doc)
      .then(() => this._downloadVideo(doc));
  }

  // Spawn a youtube-dl process to download the video.
  static _downloadVideo(doc) {
    console.info(`Downloading video ${doc.url}`);
    const cmd = this.downloadCmd.split(' ')[0];
    const args = this.downloadCmd.split(' ').slice(1);
    args.push(`${this.target}/${doc.id}/${doc.id}`);
    args.push(doc.url);
    const opts = { shell: false };
    const ps = this._downloadProcs[doc.id] = childProcess.spawn(cmd, args, opts);
    ps.stdout.on('data', data => console.info(data.toString()));
    ps.stderr.on('data', data => console.warn(data.toString()));
    ps.on('exit', (code) => {
      if (code === 0) {
        this._onVideoLoaded(doc);
      } else {
        Database.removeVideo(doc.url);
      }
      delete this._downloadProcs[doc.id];
    });
  }

  // Resize the thumbnail image.
  static _onVideoLoaded(doc) {
    const cmd = 'convert';
    const file = path.join(this.target, doc.id, `${doc.id}.jpg`);
    const args = [file, '-resize', this.thumbnailWidth, file];
    const opts = { shell: false };
    const ps = this._resizeProcs[doc.id] = childProcess.spawn(cmd, args, opts);
    ps.stdout.on('data', data => console.info(data.toString()));
    ps.stderr.on('data', data => console.warn(data.toString()));
    ps.on('exit', (code) => {
      if (code === 0) {
        this._onResized(doc);
      } else {
        Database.removeVideo(doc.url);
      }
      delete this._resizeProcs[doc.id];
    });
  }

  // Save that the video has been loaded.
  static _onResized(doc) {
    doc.loaded = true;
    Database.saveVideo(doc);
  }

  // Kill any download processes and delete any files related to a deleted record.
  static removeVideo(doc) {
    console.info(`Deleting video ${doc.url}`);
    if (this._infoProcs[doc.id]) {
      this._infoProcs[doc.id].kill();
    }
    if (this._downloadProcs[doc.id]) {
      this._downloadProcs[doc.id].kill();
    }
    if (this._resizeProcs[doc.id]) {
      this._resizeProcs[doc.id].kill();
    }
    fs.removeSync(path.join(this.target, doc.id), err => console.warn(err));
  }
}

module.exports = Downloader;
