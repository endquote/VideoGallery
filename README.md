# Video Gallery

Downloads videos from the web and plays them in a random order.

* Admin page to add/remove/select videos
* Player to play videos
* Tap/press to show video info
* Double-tap/press to go to another video

## Installation

* Install [node.js](https://nodejs.org)
* Install [Chrome](https://www.google.com/chrome/)/[Chromium](https://chromium.woolyss.com)
* Install [mongodb](https://www.mongodb.com)
* Install [ffmpeg](http://ffmpeg.org)
* Install [youtube-dl](http://rg3.github.io/youtube-dl/)
* Update youtube-dl: set up a task that runs `youtube-dl --update` daily.

## Execution

* Start mongodb: `mongod --config /usr/local/etc/mongod.conf`
* Start Video Gallery: `npm start`
  * Optional arguments: `npm start -- --port=8080 --downloads=./downloads/ --database=mongodb://localhost/`
* Video Player: [http://localhost:8080](http://localhost:8080)
* Admin: [http://localhost:8080/admin](http://localhost:8080/admin)
