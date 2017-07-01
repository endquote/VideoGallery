DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
mkdir -p ~/Library/LaunchAgents
cp com.endquote.videogallery.start-powermate.plist ~/Library/LaunchAgents/com.endquote.videogallery.start-powermate.plist
launchctl load -w ~/Library/LaunchAgents/com.endquote.videogallery.start-powermate.plist