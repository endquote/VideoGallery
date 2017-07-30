DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
cd ../../
export NODE_CONFIG_DIR=~/rgbtv
export RGBTV_URL=`node server/client-url.js`
sleep 30
open -a "Google Chrome" --args --kiosk --app=$RGBTV_URL
sleep 10
cliclick -m verbose -r m:200,200