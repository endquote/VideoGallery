DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
cd ../../
export NODE_CONFIG_DIR=~/VideoGallery
npm --prefix server start && fg