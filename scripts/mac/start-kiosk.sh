DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
cd ../../
npm install
mongod --config /usr/local/etc/mongod.conf &
npm --prefix server start &
sleep 10
open -a "Google Chrome" --args --kiosk --app=http://localhost:8080/