const path = require('path');
const fs = require('fs-extra-promise');
const childProcess = require('child_process');

const Database = require('./database');

class Downloader {
  static init(target) {
    this.target = target || path.join(__dirname, '../downloads');

    // https://github.com/rg3/youtube-dl/blob/master/README.md
    this.infoCmd = 'youtube-dl --dump-json --playlist-items 1';
    this.downloadCmd = 'youtube-dl --write-thumbnail --no-progress --playlist-items 1 -o';

    fs.ensureDirSync(this.target);
    Database.on('videoAdded', doc => this.addVideo(doc));
    Database.on('videoRemoved', doc => this.removeVideo(doc));
  }

  static addVideo(doc) {
    this._getVideoInfo(doc);
  }

  static _getVideoInfo(doc) {
    console.info(`Getting info for ${doc.url}`);
    childProcess.exec(`${this.infoCmd} ${doc.url}`, { maxBuffer: 1024 * 500 },
      (err, stdout, stderr) => this._onVideoInfo(err, stdout, stderr, doc));
  }

  static _onVideoInfo(err, stdout, stderr, doc) {
    if (err) {
      console.warn(err);
      Database.removeVideo(doc.url);
      return;
    }

    console.info(`Saving info for ${doc.url}`);
    const info = JSON.parse(stdout);
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

  static _downloadVideo(doc) {
    console.info(`Downloading video ${doc.url}`);
    childProcess.exec(`${this.downloadCmd} "${this.target}/${doc.id}" ${doc.url}`, { maxBuffer: 1024 * 500 },
      (err, stdout, stderr) => this._onVideoLoaded(err, stdout, stderr, doc));
  }

  static _onVideoLoaded(err, stdout, stderr, doc) {
    if (err) {
      console.warn(err);
      Database.removeVideo(doc.url);
      return;
    }

    console.info(stdout);
    doc.loaded = true;
    Database.saveVideo(doc);
  }

  // Remove any files with the same name as the doc id.
  static removeVideo(doc) {
    console.info(`Deleting video ${doc.url}`);
    try {
      fs.readdirAsync(this.target, (err, files) => {
        if (err) {
          console.error(err);
        }
        files.filter(f => path.parse(f).name === doc.id)
          .forEach(f => fs.unlinkAsync(path.join(this.target, f)));
      });
    } catch (err) {
      console.error(err);
    }
  }
}

module.exports = Downloader;
