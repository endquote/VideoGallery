DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
echo 'export NODE_CONFIG_DIR=~/.node' >>~/.bash_profile
mkdir ~/.node
cp ../../server/config/default.json ~/.node/local.json
source ~/.bash_profile
