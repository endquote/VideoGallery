DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
cd ../../
export NODE_CONFIG_DIR=~/VideoGallery
mongod --config /usr/local/etc/mongod.conf &
npm --prefix server start &
npm --prefix client run dev && fg
