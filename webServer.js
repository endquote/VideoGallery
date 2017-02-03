const express = require('express');
const http = require('http');
const path = require('path');

class WebServer {
  static init(database, port = 8080) {
    // Set up web server.
    const app = express();
    const httpServer = WebServer.httpServer = http.Server(app);
    httpServer.listen(port);

    // Routes for static content.
    app.get('/', (req, res) => {
      res.sendfile(path.join(__dirname, 'client', 'player.html'));
    });
    app.get('/admin', (req, res) => {
      res.sendfile(path.join(__dirname, 'client', 'admin.html'));
    });
    app.use(express.static(path.join(__dirname, 'client')));

    // Get all videos.
    app.get('/videos', (req, res) => {
      database.getVideos()
        .then(result => res.json(result));
    });

    // Post to add a video.
    app.post('/video', (req, res) => {
      database.addVideo(req.query.url)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    });

    // Delete to delete a video.
    app.delete('/video', (req, res) => {
      database.removeVideo(req.query.url)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    });

    // Put to select a video.
    app.put('/video', (req, res) => {
      database.selectVideo(req.query.url)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    });
  }
}

module.exports = WebServer;
