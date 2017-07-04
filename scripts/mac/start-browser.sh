DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
cd ../../
export NODE_CONFIG_DIR=~/rgbtv
export RGBTV_URL=`node client/src/scripts/client-url.js`
sleep 30
open -a "Google Chrome" --args --kiosk --app=$RGBTV_URL