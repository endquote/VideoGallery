# Windows Setup

## Installation

1. Install [Chrome](https://www.google.com/chrome/)
1. Install [node.js](https://nodejs.org)
1. Install [ImageMagick](http://www.imagemagick.org/script/download.php#windows)
1. Download [youtube-dl](https://rg3.github.io/youtube-dl/download.html), place it at `C:\Program Files\youtube-dl\youtube-dl.exe`, and put `C:\Program Files\youtube-dl` in the system `%PATH%.
1. Install [mongodb](https://www.mongodb.com), and [set up the service](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/#configure-a-windows-service-for-mongodb-community-edition)
1. `npm install --prefix C:\VideoGallery https://github.com/endquote/VideoGallery`
1. Run `C:\VideoGallery\node_modules\video-gallery\scripts\windows\install-config.bat` to set up the server config file
1. [Edit the server config file](config.md) in your home folder at `C:\VideoGallery\local.json` as needed

## Get Updates

`npm install --prefix C:\VideoGallery https://github.com/endquote/VideoGallery`

## Execution

Startup scripts are in `C:\VideoGallery\node_modules\video-gallery\scripts\windows`.

* `start-server.bat` - Run the application server.

When the sever is running, the web interfaces are at:

* Video Player: [http://localhost:8080](http://localhost:8080)
* Admin: [http://localhost:8080/admin](http://localhost:8080/admin)

...but the port can be changed with the [config file](#config).

## Kiosk Setup

Additional steps to run things at startup.

* Set up an [automatic login](https://technet.microsoft.com/en-us/library/ee872306.aspx).

[Open Task Scheduler](https://technet.microsoft.com/en-us/library/cc721931(v=ws.11).aspx), and use `Action > Import Task` to get the tasks from `C:\VideoGallery\node_modules\video-gallery\scripts\windows\`.

* `task-update-ytdl.xml` - Automatically update youtube-dl daily.
* `task-start-server.xml` - Automatically start the server on login.
* `task-start-browser.xml` - Automatically start the browser in kiosk mode on login. (If you modified the port in the config file, you'll need to edit this file to match.)

## Development

Development scripts are in `C:\VideoGallery\node_modules\video-gallery\scripts\windows`.

* `start-server-dev.bat` - Run application server in a development context, restarting when code is modified.
* `start-client-dev.bat` - Run a client development process, rebuilding when files are modified, and with [Browser Sync](https://browsersync.io) features.

The project is set up to take advantage of the [VS Code](https://code.visualstudio.com) debugger and extensions.
