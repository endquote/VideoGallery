DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
mkdir -p ~/Library/LaunchAgents
cp com.endquote.videogallery.start-browser.plist ~/Library/LaunchAgents/com.endquote.videogallery.start-browser.plist
launchctl load -w ~/Library/LaunchAgents/com.endquote.videogallery.start-browser.plist