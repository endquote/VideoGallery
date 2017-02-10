npm install
mongod --config /usr/local/etc/mongod.conf &
npm --prefix server run dev -- & # --port=8080 --downloads=./downloads/ --database=mongodb://localhost/
npm --prefix client run dev && fg
