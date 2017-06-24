DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
cd ../../
npm install
mongod --config /usr/local/etc/mongod.conf &
npm --prefix server run dev -- --username=username --password=password & # --port=8080 --downloads=./downloads/ --database=mongodb://localhost/
npm --prefix client run dev && fg
