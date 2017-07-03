DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
mkdir ~/.VideoGallery
cp ../../server/config/default-mac.json ~/.VideoGallery/default.json
cp ../../server/config/default-mac.json ~/.VideoGallery/local.json
