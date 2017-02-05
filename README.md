# Video Gallery

Downloads videos from the web and plays them in a random order.

* Admin page to add/remove/select videos
* Player to play videos
* Tap/press to show video info
* Double-tap/press to go to another video

## Installation

1. Install [node.js](https://nodejs.org)
2. Install [Chrome](https://www.google.com/chrome/)/[Chromium](https://chromium.woolyss.com)
3. Install [mongodb](https://www.mongodb.com)
4. Install [ffmpeg](http://ffmpeg.org)
5. Install [youtube-dl](http://rg3.github.io/youtube-dl/)
6. Update youtube-dl: set up a task that runs `youtube-dl --update` daily.

## Execution

1. Start mongodb: `mongod --config /usr/local/etc/mongod.conf`
2. Start Video Gallery server: `npm start`
  * Optional arguments: `npm start -- --port=8080 --downloads=./downloads/ --database=mongodb://localhost/`
3. Video Player: [http://localhost:8080](http://localhost:8080)
4. Admin: [http://localhost:8080/admin](http://localhost:8080/admin)

## Development

1. Start mongodb
2. From root, `npm install`
3. From `server`, run `npm install; npm run dev`
4. From `client`, run `npm install; npm start`

The project is set up to take advantage of the [VS Code](https://code.visualstudio.com) debugger and extensions.
