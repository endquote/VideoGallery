DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
cd ../../
npm install
mongod --config /usr/local/etc/mongod.conf &
npm --prefix server start -- && fg # --username=username --password=password --port=8080 --downloads=./downloads/ --database=mongodb://localhost/
