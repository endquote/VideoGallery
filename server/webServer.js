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

    // Routes for static content.
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/player.html'));
    });
    app.get('/admin', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/admin.html'));
    });
    app.use(express.static(path.join(__dirname, '../client/dist')));

    // Routes for video content.
    app.use('/content', (req, res) => {
      const [channelName, type, id] = req.originalUrl.toLowerCase().split('/').slice(2);
      if (!id || id === 'undefined') {
        res.sendStatus(404);
        return;
      }

      if (type === 'thumbnail') {
        // Thumbnails are the ID + jpg
        try {
          res.sendFile(path.join(this.target, channelName, id, `${id}-resized.jpg`));
        } catch (e) {
          res.sendStatus(404);
        }
      } else if (type === 'video') {
        // Videos have unknown file extensions
        fs.readdirAsync(path.join(this.target, channelName, id), (err, files) => {
          if (err) {
            res.sendStatus(404);
            return;
          }
          const file = files.find((f) => {
            const parsed = path.parse(f);
            return parsed.ext !== '.jpg' && parsed.name === id;
          });
          if (!file) {
            res.sendStatus(404);
          } else {
            try {
              res.sendFile(path.join(this.target, channelName, id, file));
            } catch (e) {
              res.sendStatus(404);
            }
          }
        });
      } else {
        res.sendStatus(404);
      }
    });

    // Get all videos.
    app.get('/api/videos', (req, res) => {
      Database.getVideos().then(result => res.json(result));
    });

    // Post to add a video.
    app.post('/api/video', (req, res) => {
      Database.addVideo(req.body.url)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    });

    // Delete to delete a video.
    app.delete('/api/video', (req, res) => {
      Database.removeVideo(req.body._id)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    });

    // Re-download everything.
    app.get('/reprocess', (req, res) => {
      Database.getVideos().then((result) => {
        result.forEach(doc => Downloader.addVideo(doc));
        return res.sendStatus(200);
      });
    });
  }
}

module.exports = WebServer;
