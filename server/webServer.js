const express = require('express');
const basicAuth = require('express-basic-auth');
const conditional = require('express-conditional-middleware');
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');
const fs = require('fs-extra');

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
    app.use(bodyParser.urlencoded({ extended: false }));

    // Set up authorization, but let localhost through.
    app.use(
      conditional(
        (req) => {
          const notIcon = req.path.indexOf('/images/icons') !== 0;
          const authConfiged = username !== '' || password !== '';
          const isRemote =
            ['127.0.0.1', '::ffff:127.0.0.1', '::1'].indexOf(
              req.connection.remoteAddress,
            ) === -1;
          const doAuth = authConfiged && isRemote && notIcon;
          return doAuth;
        },
        basicAuth({
          authorizer: (u, p) => u === username && p === password,
          challenge: true,
          realm: 'Imb4T3st4px',
        }),
      ),
    );

    const httpServer = http.Server(app);
    this.httpServer = httpServer;
    httpServer.listen(port, () => {
      console.log(`HTTP server listening on ${port}`);
    });

    // Routing for GET requests.
    app.get('*', (req, res) => {
      const parts = req.path.toLowerCase().split('/').slice(1);
      const root = parts.shift();

      // Send various static assets.
      if (root === 'images' || root === 'scripts' || root === 'styles') {
        return res.sendFile(path.join(__dirname, '../client/dist/', req.path));
      }

      if (root === 'api') {
        // Send GET API responses.
        const method = parts.shift();
        if (method === 'channels') {
          // Get all channels.
          return Database.getChannels().then(result =>
            res.json({ current: result, invalid: Database.invalidChannels }),
          );
        } else if (method === 'videos') {
          // Get all videos.
          const channel = parts.shift();
          return Database.getVideos(channel).then(result => res.json(result));
        } else if (method === 'reprocess') {
          // Re-download everything.
          return Database.getVideos().then((result) => {
            result.forEach(doc => Downloader.addVideo(doc));
            return res.sendStatus(200);
          });
        }
      } else if (root === 'content') {
        // Return media files.
        const videoId = parts.shift();
        const contentType = parts.shift();
        if (videoId) {
          if (contentType === 'thumbnail') {
            // Thumbnails are the ID + jpg
            try {
              return res.sendFile(
                path.join(this.target, videoId, `${videoId}-resized.jpg`),
              );
            } catch (e) {
              return res.sendStatus(404);
            }
          } else if (contentType === 'video') {
            // Videos have unknown file extensions
            return fs
              .readdir(path.join(this.target, videoId))
              .then((files) => {
                const file = files.find((f) => {
                  const parsed = path.parse(f);
                  return parsed.ext !== '.jpg' && parsed.name === videoId;
                });
                return res.sendFile(path.join(this.target, videoId, file));
              })
              .catch(() => res.sendStatus(404));
          }
        }
      } else if (root === 'admin') {
        return res.sendFile(path.join(__dirname, '../client/dist/admin.html'));
      } else {
        return res.sendFile(path.join(__dirname, '../client/dist/player.html'));
      }

      return res.sendStatus(404);
    });

    // Routing for POST requests.
    app.post('*', (req, res) => {
      const [page, method] = req.path.split('/').slice(1);
      if (page === 'api') {
        if (method === 'video') {
          // Add a video or channel.
          return Database.addVideo(req.body.url, req.body.channel)
            .then(() => res.sendStatus(200))
            .catch(err => res.status(500).send(err));
        }
      }

      return res.sendStatus(404);
    });

    // Routing for PATCH requests.
    app.patch('*', (req, res) => {
      const [page, method] = req.path.split('/').slice(1);
      if (page === 'api') {
        if (method === 'video') {
          // Delete a video or channel.
          return Database.removeVideo(req.body.id, req.body.channel)
            .then(() => res.sendStatus(200))
            .catch(err => res.status(500).send(err));
        }
      }

      return res.sendStatus(404);
    });
  }
}

module.exports = WebServer;
