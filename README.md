# Video Gallery

Downloads videos from the web and plays them in a random order.

* [Features](#features)
* [Controls](#features)
* [Mac Setup](#mac)
* [Windows Setup](#windows)
* [Configuration](#config)
* [Development](#development)

<a name="features"></a>
# Features

* Support for videos from YouTube, Vimeo, and [lots of other places](http://rg3.github.io/youtube-dl/supportedsites.html)
* Web-based admin page to add/remove/select videos
* Web-based video player page
* Overlay with video info, QR code link to video page

<a name="controls"></a>
# Controls

Use a touch screen, mouse, or [PowerMate Bluetooth](https://griffintechnology.com/us/powermate-bluetooth) (Mac only) to control playback.

* 1 tap to show info overlay
* 2 taps to turn on audio
* 3 taps to hide info overlay
* 4 taps to turn off audio
* Double-tap to play a different video
* Rotate PowerMate to change playback position

<a name="mac"></a>
# Mac Setup

## Installation

1. Install [Chrome](https://www.google.com/chrome/)
1. Install [Xcode](https://itunes.apple.com/us/app/xcode/id497799835?mt=12), launch it once to finish install
1. Install [Homebrew](https://brew.sh)
1. `brew install node imagemagick mongodb ffmpeg youtube-dl`
1. `brew services start mongodb`
1. `npm install --prefix ~/VideoGallery https://github.com/endquote/VideoGallery`
1. Run `~/VideoGallery/node_modules/video-gallery/scripts/mac/install-config.sh` to set up the server config file
1. `nano ~/.VideoGallery/local.json` to [edit the server config file](#config) as needed

## Get Updates

`npm install --prefix ~/VideoGallery https://github.com/endquote/VideoGallery`

## Execution

Startup scripts are in `~/VideoGallery/node_modules/video-gallery/scripts/mac/`.

* `start-server.sh` - Run the database and web servers.
* `start-server-dev.sh` - Run the database and web servers in a development context, with hot reloading of files and such.
* `start-powermate.sh` - Run the Powermate controller service.

When the sever is running, the web interfaces are at:

* Video Player: [http://localhost:8080](http://localhost:8080)
* Admin: [http://localhost:8080/admin](http://localhost:8080/admin)

## Kiosk Setup

Additional steps to run things at startup.

* Set up an [automatic login](https://support.apple.com/en-us/HT201476).

These scripts are in `~/VideoGallery/node_modules/video-gallery/scripts/mac/`.

* `install-update-ytdl.sh` - Automatically update youtube-dl daily.
* `install-start-server.sh` - Automatically start the server on login.
* `install-start-powermate.sh` - Automatically start the Powermate service on login.
* `install-start-browser.sh` - Automatically start the browser in kiosk mode on login.

To disable these behaviors later, remove the relevant files from `~/Library/LaunchAgents`.

To restart the server, such as after getting updates, run `restart-server.sh`.

<a name="windows"></a>
# Windows Setup

## Installation

1. Install [Chrome](https://www.google.com/chrome/)
1. Install [node.js](https://nodejs.org)
1. Install [ImageMagick](http://www.imagemagick.org/script/download.php#windows)
1. Install [youtube-dl](http://rg3.github.io/youtube-dl/)
1. Install [mongodb](https://www.mongodb.com), and [set up the service](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/#configure-a-windows-service-for-mongodb-community-edition)
1. `npm install --prefix C:\VideoGallery https://github.com/endquote/VideoGallery`
1. Run `C:\VideoGallery\node_modules\video-gallery\scripts\windows\install-config.bat` to set up the server config file
1. [Edit the server config file](#config) in your home folder at `.VideoGallery\local.json` as needed

## Get Updates

`npm install --prefix C:\VideoGallery https://github.com/endquote/VideoGallery`

## Execution

Startup scripts are in `C:\VideoGallery\node_modules\video-gallery\scripts\windows`.

* `start-server.bat` - Run the database and web servers.
* `start-server-dev.bat` - Run the database and web servers in a development context, with hot reloading of files and such.

When the sever is running, the web interfaces are at:

* Video Player: [http://localhost:8080](http://localhost:8080)
* Admin: [http://localhost:8080/admin](http://localhost:8080/admin)

## Kiosk Setup

Additional steps to run things at startup.

* Set up an [automatic login](https://support.apple.com/en-us/HT201476).
* `install-update-ytdl.sh` - Automatically update youtube-dl daily.
* `install-server-startup.sh` - Automatically start the server on login.
* `install-powermate-startup.sh` - Automatically start the Powermate service on login.
* `install-browser-startup.sh` - Automatically start the browser in kiosk mode on login.

<a name="config"></a>
# Configuration File

Document me.

<a name="development"></a>
# Development

The project is set up to take advantage of the [VS Code](https://code.visualstudio.com) debugger and extensions.
