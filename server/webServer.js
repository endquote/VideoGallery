const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');

const Database = require('./database');

class WebServer {
  static init(port = 8080, target) {
    this.target = target || path.join(__dirname, '../downloads');

    // Set up web server.
    const app = express();
    app.use(bodyParser.json());

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
    app.use('/downloads', express.static(this.target));

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

    // Put to select a video.
    app.put('/video', (req, res) => {
      Database.selectVideo(req.body.url)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    });
  }
}

module.exports = WebServer;
