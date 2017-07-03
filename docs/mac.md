# Mac Setup

## Installation

1. Install [Chrome](https://www.google.com/chrome/)
1. Install [Xcode](https://itunes.apple.com/us/app/xcode/id497799835?mt=12), launch it once to finish install
1. Install [Homebrew](https://brew.sh)
1. `brew install node imagemagick mongodb ffmpeg youtube-dl`
1. `brew services start mongodb`
1. `npm install --prefix ~/VideoGallery https://github.com/endquote/VideoGallery`
1. Run `~/VideoGallery/node_modules/video-gallery/scripts/mac/install-config.sh` to set up the server config file
1. `nano ~/.VideoGallery/local.json` to [edit the server config file](config.md) as needed

## Get Updates

`npm install --prefix ~/VideoGallery https://github.com/endquote/VideoGallery`

## Execution

Startup scripts are in `~/VideoGallery/node_modules/video-gallery/scripts/mac/`.

* `start-server.sh` - Run the application server.
* `start-powermate.sh` - Run the Powermate controller service.

When the sever is running, the web interfaces are at:

* Video Player: [http://localhost:8080](http://localhost:8080)
* Admin: [http://localhost:8080/admin](http://localhost:8080/admin)

...but the port can be changed with the [config file](config.md).

## Kiosk Setup

Additional steps to run things at startup.

* Set up an [automatic login](https://support.apple.com/en-us/HT201476).

These scripts are in `~/VideoGallery/node_modules/video-gallery/scripts/mac/`.

* `install-update-ytdl.sh` - Automatically update youtube-dl daily.
* `install-start-server.sh` - Automatically start the server on login.
* `install-start-powermate.sh` - Automatically start the Powermate service on login.
* `install-start-browser.sh` - Automatically start the browser in kiosk mode on login. (If you modified the port in the config file, you'll need to edit this file to match.)

To disable these behaviors later, remove the relevant files from `~/Library/LaunchAgents`.

To restart the server, such as after getting updates, run `restart-server.sh`.

## Development

Development scripts are in `~/VideoGallery/node_modules/video-gallery/scripts/mac/`.

* `start-server-dev.sh` - Run application server in a development context, restarting when code is modified.
* `start-client-dev.sh` - Run a client development process, rebuilding when files are modified, and with [Browser Sync](https://browsersync.io) features.

