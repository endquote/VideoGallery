const express = require('express');
const basicAuth = require('express-basic-auth');
const conditional = require('express-conditional-middleware');
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');
const fs = require('fs-extra-promise');

const Database = require('./database');
const Downloader = require('./downloader');

class WebServer {
  static init(port = 8080, target, username = '', password = '') {
    // Support home folder
    if (target[0] === '~') {
      target = path.join(process.env.HOME, target.slice(1));
    }

    this.target = target || '../downloads';
    this.target = path.resolve(target);

    // Set up web server.
    const app = express();
    app.use(bodyParser.json());

    // Set up authorization, but let localhost through.
    app.use(conditional(
      (req) => {
        const notIcon = req.path.indexOf('/images/icons') !== 0;
        const authConfiged = username !== '' || password !== '';
        const isRemote = ['127.0.0.1', '::ffff:127.0.0.1', '::1'].indexOf(req.connection.remoteAddress) === -1;
        const doAuth = authConfiged && isRemote && notIcon;
        return doAuth;
      },
      basicAuth({
        authorizer: (u, p) => u === username && p === password,
        challenge: true,
        realm: 'Imb4T3st4px',
      })));

    const httpServer = http.Server(app);
    this.httpServer = httpServer;
    httpServer.listen(port, () => {
      console.log(`HTTP server listening on ${port}`);
    });

    // Routing for GET requests.
    app.get('*', (req, res) => {
      // Send various static assets.
      const root = req.path.split('/')[1];
      if (root === 'images' || root === 'scripts' || root === 'styles') {
        return res.sendFile(path.join(__dirname, '../client/dist/', req.path));
      }

      return this.parsePath(req.path)
        .then(({ channelName, page, method, videoId }) => {
          // Send the player page.
          if (page === 'player') {
            return res.sendFile(path.join(__dirname, '../client/dist/player.html'));
          }

          // Send the admin page.
          if (page === 'admin') {
            return res.sendFile(path.join(__dirname, '../client/dist/admin.html'));
          }

          // Return GET API calls.
          if (page === 'api') {
            if (method === 'videos') {
              // Get all videos.
              return Database.getVideos(channelName).then(result => res.json(result));
            } else if (method === 'reprocess') {
              // Re-download everything.
              return Database.getVideos().then((result) => {
                result.forEach(doc => Downloader.addVideo(doc));
                return res.sendStatus(200);
              });
            } else if (method === 'channels') {
              // Get all channels.
              return Database.getChannels(channelName).then(result => res.json(result));
            }
          }

          // Send video content files.
          if (page === 'content') {
            if (videoId) {
              if (method === 'thumbnail') {
                // Thumbnails are the ID + jpg
                try {
                  return res.sendFile(path.join(this.target, channelName, videoId, `${videoId}-resized.jpg`));
                } catch (e) {
                  return res.sendStatus(404);
                }
              } else if (method === 'video') {
                // Videos have unknown file extensions
                return fs.readdirAsync(path.join(this.target, channelName, videoId))
                  .then((files) => {
                    const file = files.find((f) => {
                      const parsed = path.parse(f);
                      return parsed.ext !== '.jpg' && parsed.name === videoId;
                    });
                    return res.sendFile(path.join(this.target, channelName, videoId, file));
                  })
                  .catch(() => res.sendStatus(404));
              }
            }
          }

          return res.sendStatus(404);
        })
        .catch(() => res.sendStatus(404));
    });

    // Routing for POST requests.
    app.post('*', (req, res) => {
      return this.parsePath(req.path)
        .then(({ channelName, page, method, videoId }) => { // eslint-disable-line no-unused-vars
          if (page === 'api') {
            if (method === 'video') {
              // Post to add a video.
              return Database.addVideo(req.body.url, channelName)
                .then(() => res.sendStatus(200))
                .catch(() => res.sendStatus(500));
            }

            if (method === 'channel') {
              // Post to add a channel.
              return Database.addChannel(req.body.channelName)
                .then(() => res.sendStatus(200))
                .catch(() => res.sendStatus(500));
            }
          }

          return res.sendStatus(404);
        })
        .catch(() => res.sendStatus(404));
    });

    // Routing for DELETE requests.
    app.delete('*', (req, res) => {
      return this.parsePath(req.path)
        .then(({ channelName, page, method, videoId }) => {
          if (page === 'api') {
            if (method === 'video') {
              // Delete to delete a video.
              return Database.removeVideo(videoId, channelName)
                .then(() => res.sendStatus(200))
                .catch(() => res.sendStatus(500));
            }
          }

          return res.sendStatus(404);
        })
        .catch(() => res.sendStatus(404));
    });
  }

  static parsePath(reqPath) {
    /*
    / - default player
    /admin - default admin
    /channel - channel player
    /channel/admin - channel admin
    /api - default api
    /channel/api - channel api
    /images, /scripts, /styles - static assets
    /channel/content - video content files
    */
    let [channelName, page, method, videoId] = reqPath.toLowerCase().split('/').slice(1); // eslint-disable-line prefer-const

    if (!channelName || channelName === 'admin' || channelName === 'api') {
      method = page;
      page = channelName;
      channelName = Database.defaultChannel;
    }

    if (!page) {
      page = 'player';
    }

    return Database.getChannels()
      .then((channels) => {
        if (!channels.find(c => c.name === channelName)) {
          return Promise.reject('Invalid channel');
        }
        return { channelName, page, method, videoId };
      });
  }
}

module.exports = WebServer;
