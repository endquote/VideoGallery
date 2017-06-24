# Video Gallery

Downloads videos from the web and plays them in a random order.

## Features

* Support for videos from YouTube, Vimeo, and [lots of other places](http://rg3.github.io/youtube-dl/supportedsites.html)
* Web-based admin page to add/remove/select videos
* Web-based video player page
* Overlay with video info, QR code link to video page

### Controls

Use a touch screen, mouse, or [PowerMate Bluetooth](https://griffintechnology.com/us/powermate-bluetooth) (Mac only) to control playback.

* 1 tap to show info overlay
* 2 taps to turn on audio
* 3 taps to hide info overlay
* 4 taps to turn off audio
* Double-tap to play a different video
* Rotate PowerMate to change playback position

## Installation

### Mac

1. Install [Chrome](https://www.google.com/chrome/)
1. Install [Xcode](https://itunes.apple.com/us/app/xcode/id497799835?mt=12), launch it once to finish install
1. Install [Homebrew](https://brew.sh)
1. `brew install node imagemagick mongodb ffmpeg youtube-dl`
1. `brew services start mongodb`
1. `npm install --prefix ~/VideoGallery https://github.com/endquote/VideoGallery`
1. Run `~/VideoGallery/node_modules/video-gallery/scripts/mac/install-update-ytdl.sh` to automatically update youtube-dl daily

### Windows

1. Install [Chrome](https://www.google.com/chrome/)
1. Install [node.js](https://nodejs.org)
1. Install [mongodb](https://www.mongodb.com)
1. Install [ffmpeg](http://ffmpeg.org)
1. Install [youtube-dl](http://rg3.github.io/youtube-dl/)
1. `npm install --prefix C:\VideoGallery https://github.com/endquote/VideoGallery`
1. Use Task Scheduler to run `youtube-dl --update` daily.

## Execution

See the `scripts` folder for startup scripts for Mac and Windows.

* `start` to just start the server.
* `start-dev` to start the server and build the client, with automatic restarting and rebuilding for development.
* `start-kiosk` to run the server, build the client, and launch Chrome in kiosk mode.

When the sever is running, the web interfaces are at:

* Video Player: [http://localhost:8080](http://localhost:8080)
* Admin: [http://localhost:8080/admin](http://localhost:8080/admin)

## Updates

* Mac: `npm install --prefix ~/VideoGallery https://github.com/endquote/VideoGallery`
* Windows: `npm install --prefix C:\VideoGallery https://github.com/endquote/VideoGallery`

## Run on Startup

### Mac

1. Set up an [automatic login](https://support.apple.com/en-us/HT201476).
1. Run `~/VideoGallery/node_modules/video-gallery/scripts/mac/install-kiosk-startup.sh`.
    * In theory. Currently not working. `launchd` is a MF.

### Windows

1. Set up an [automatic login](https://technet.microsoft.com/en-us/library/ee872306.aspx).
1. Press `Win+R`
1. Type `shell:startup`
1. Place a shortcut to `C:\VideoGallery\scripts\windows\start-kiosk.bat` in the folder.

## Development

The project is set up to take advantage of the [VS Code](https://code.visualstudio.com) debugger and extensions.
