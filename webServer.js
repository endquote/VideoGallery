const express = require('express');
const http = require('http');
const path = require('path');

class WebServer {
  static init(database, port = 8080) {
    const app = express();
    const httpServer = WebServer.httpServer = http.Server(app);

    httpServer.listen(port);

    app.get('/', (req, res) => {
      res.sendfile(path.join(__dirname, 'client', 'index.html'));
    });

    app.get('/videos', (req, res) => {
      database.getVideos()
        .then(result => res.json(result));
    });

    app.post('/video', (req, res) => {
      database.addVideo(req.query.url)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    });

    app.delete('/video', (req, res) => {
      database.removeVideo(req.query.url)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    });

    app.put('/selectVideo', (req, res) => {
      database.selectVideo(req.query.url)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    });
  }
}

module.exports = WebServer;
