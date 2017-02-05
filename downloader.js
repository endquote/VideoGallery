const path = require('path');
const fs = require('fs-extra');
const childProcess = require('child_process');

class Downloader {
  static init(database, target) {
    this.database = database;
    this.target = target || path.join(__dirname, 'downloads');

    // https://github.com/rg3/youtube-dl/blob/master/README.md
    this.infoCmd = 'youtube-dl --dump-json --playlist-items 1';
    this.downloadCmd = 'youtube-dl --write-thumbnail --no-progress --playlist-items 1 -o';

    fs.ensureDirSync(this.target);
    database.on('videoAdded', doc => this.addVideo(doc));
    database.on('videoRemoved', doc => this.removeVideo(doc));
  }

  static addVideo(doc) {
    this._getVideoInfo(doc);
  }

  static _getVideoInfo(doc) {
    console.info(`Getting info for ${doc.url}`);
    childProcess.exec(`${this.infoCmd} ${doc.url}`,
      (err, stdout, stderr) => this._onVideoInfo(err, stdout, stderr, doc));
  }

  static _onVideoInfo(err, stdout, stderr, doc) {
    if (err || stderr) {
      console.warn(err || stderr);
      this.database.removeVideo(doc.url);
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
    doc.file = doc.id + path.parse(info._filename).ext;
    doc.thumbnail = `${doc.id}.jpg`;
    doc.url = info.webpage_url;
    doc.save()
      .then(() => this._downloadVideo(doc));
  }

  static _downloadVideo(doc) {
    console.info(`Downloading video ${doc.url}`);
    childProcess.exec(`${this.downloadCmd} "${this.target}/${doc.id}" ${doc.url}`,
      (err, stdout, stderr) => this._onVideoLoaded(err, stdout, stderr, doc));
  }

  static _onVideoLoaded(err, stdout, stderr, doc) {
    if (err || stderr) {
      console.warn(err || stderr);
      this.database.removeVideo(doc.url);
      return;
    }

    console.info(stdout);
    doc.loaded = true;
    doc.save();
  }

  static removeVideo(doc) {
    console.info(`Deleting video ${doc.url}`);
    try {
      fs.unlinkSync(path.join(this.target, doc.file));
      fs.unlinkSync(path.join(this.target, doc.thumbnail));
    } catch (e) {
      // ignore
    }
  }
}

module.exports = Downloader;
