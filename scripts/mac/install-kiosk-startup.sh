DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
mkdir -p ~/Library/LaunchAgents
cp com.endquote.launch-videogallery.plist ~/Library/LaunchAgents/com.endquote.launch-videogallery.plist
launchctl load -w ~/Library/LaunchAgents/com.endquote.launch-videogallery.plist