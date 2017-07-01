const express = require('express');
const basicAuth = require('express-basic-auth');
const conditional = require('express-conditional-middleware');
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');
const fs = require('fs-extra-promise');

const Database = require('./database');

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
      (req, res, next) => {
        const authConfiged = username !== '' || password !== '';
        const isRemote = ['127.0.0.1', '::ffff:127.0.0.1', '::1'].indexOf(req.connection.remoteAddress) === -1
        return authConfiged && isRemote;
      },
      basicAuth({
        authorizer: (u, p) => u === username && p === password,
        challenge: true,
        realm: 'Imb4T3st4px',
      })));

    const httpServer = this.httpServer = http.Server(app);
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
      const type = req.originalUrl.split('/')[2].toLowerCase();
      const id = req.originalUrl.split('/')[3];
      if (!id || id === 'undefined') {
        res.sendStatus(404);
        return;
      }

      if (type === 'thumbnail') {
        // Thumbnails are the ID + jpg
        try {
          res.sendFile(path.join(this.target, id, `${id}.jpg`));
        } catch (e) {
          res.sendStatus(404);
        }
      } else if (type === 'video') {
        // Videos have unknown file extensions
        fs.readdirAsync(path.join(this.target, id), (err, files) => {
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
              res.sendFile(path.join(this.target, id, file));
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
    app.get('/videos', (req, res) => {
      Database.getVideos().then(result => res.json(result));
    });

    // Post to add a video.
    app.post('/video', (req, res) => {
      Database.addVideo(req.body.url)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    });

    // Delete to delete a video.
    app.delete('/video', (req, res) => {
      Database.removeVideo(req.body._id)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    });
  }
}

module.exports = WebServer;
