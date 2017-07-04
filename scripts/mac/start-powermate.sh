DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
cd ../../
cd controllers/powermate
export NODE_CONFIG_DIR=~/rgbtv
npm install
npm start