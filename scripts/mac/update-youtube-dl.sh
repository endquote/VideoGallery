mkdir -p ~/Library/LaunchAgents
cp com.endquote.update-youtube-dl.plist ~/Library/LaunchAgents/com.endquote.update-youtube-dl.plist
launchctl load -w ~/Library/LaunchAgents/com.endquote.update-youtube-dl.plist