class Help {
  static parseVideo(video) {
    video.added = new Date(video.added);
    video.created = new Date(video.created);
  }
}

module.exports = Help;
