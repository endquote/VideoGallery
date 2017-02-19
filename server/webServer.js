const express = require('express');
const basicAuth = require('express-basic-auth')
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');
const fs = require('fs-extra-promise');

const Database = require('./database');

class WebServer {
  static init(port = 8080, target, username = '', password = '') {
    this.target = target || path.join(__dirname, '../downloads');

    // Set up web server.
    const app = express();
    app.use(bodyParser.json());

    if (username !== '' || password !== '') {
      app.use(basicAuth({
        authorizer: (u, p) => u === username && p === password,
        challenge: true,
        realm: 'Imb4T3st4px',
      }));
    }

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
      try {
        const type = req.originalUrl.split('/')[2].toLowerCase();
        const id = req.originalUrl.split('/')[3];

        // Thumbnails are the ID + jpg
        if (type === 'thumbnail') {
          res.sendFile(path.join(__dirname, target, `${id}.jpg`));

          // Videos have unknown file extensions
        } else if (type === 'video') {
          fs.readdirAsync(path.join(__dirname, target), (err, files) => {
            const file = files.find((f) => {
              const parsed = path.parse(f);
              return parsed.ext !== '.jpg' && parsed.name === id;
            });
            if (!file) {
              res.sendStatus(404);
            } else {
              res.sendFile(path.join(__dirname, target, file));
            }
          });
        } else {
          res.sendStatus(404);
        }
      } catch (e) {
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
      Database.removeVideo(req.body.url)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    });
  }
}

module.exports = WebServer;
