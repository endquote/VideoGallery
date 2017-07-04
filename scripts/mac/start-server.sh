DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
cd ../../
export NODE_CONFIG_DIR=~/rgbtv
npm --prefix server start