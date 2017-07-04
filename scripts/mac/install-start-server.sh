DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
mkdir -p ~/Library/LaunchAgents
cp tv.rgbtv.start-server.plist ~/Library/LaunchAgents/tv.rgbtv.start-server.plist
launchctl load -w ~/Library/LaunchAgents/tv.rgbtv.start-server.plist