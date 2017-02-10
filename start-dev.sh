npm install
mongod --config /usr/local/etc/mongod.conf &
node-red node-red.json &
npm --prefix server run dev -- & # --port=8080 --downloads=./downloads/ --database=mongodb://localhost/
npm --prefix client run dev && fg
