npm install
mongod --config /usr/local/etc/mongod.conf &
npm --prefix server start -- && fg # --port=8080 --downloads=./downloads/ --database=mongodb://localhost/
