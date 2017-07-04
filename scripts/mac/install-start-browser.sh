DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
mkdir -p ~/Library/LaunchAgents
cp tv.rgbtv.start-browser.plist ~/Library/LaunchAgents/tv.rgbtv.start-browser.plist
launchctl load -w ~/Library/LaunchAgents/tv.rgbtv.start-browser.plist