DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
mkdir -p ~/Library/LaunchAgents
cp tv.rgbtv.update-ytdl.plist ~/Library/LaunchAgents/tv.rgbtv.update-ytdl.plist
launchctl load -w ~/Library/LaunchAgents/tv.rgbtv.update-ytdl.plist