DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
mkdir ~/rgbtv
cp ../../server/config/default-mac.json ~/rgbtv/default.json
cp ../../server/config/default-mac.json ~/rgbtv/local.json
