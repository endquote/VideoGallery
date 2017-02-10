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
7. Download the package, run `npm install` from the root.

## Execution

See `start.sh` and `start-dev.sh`.

* Video Player: [http://localhost:8080](http://localhost:8080)
* Admin: [http://localhost:8080/admin](http://localhost:8080/admin)

## Development

The project is set up to take advantage of the [VS Code](https://code.visualstudio.com) debugger and extensions.
