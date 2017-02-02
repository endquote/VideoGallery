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
      database.getVideos().then((doc) => {
        res.send(JSON.stringify(doc));
      });
    });

    app.post('/video', (req, res) => {

    });

    app.delete('/video', (req, res) => {

    });

    app.post('/selectVideo', (req, res) => {

    });
  }
}

module.exports = WebServer;
