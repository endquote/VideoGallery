DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
cd ../../
cd controllers/powermate
export NODE_CONFIG_DIR=~/VideoGallery
npm install
npm start