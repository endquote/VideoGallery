const fs = require('fs');
const path = require('path');

const clientFile = path.join(__dirname, 'client/package.json');
const clientPackage = JSON.parse(fs.readFileSync(clientFile));
clientPackage.version = process.env.npm_package_version;
fs.writeFileSync(clientFile, JSON.stringify(clientPackage, null, 2));

const serverFile = path.join(__dirname, 'server/package.json');
const serverPackage = JSON.parse(fs.readFileSync(serverFile));
serverPackage.version = process.env.npm_package_version;
fs.writeFileSync(serverFile, JSON.stringify(serverPackage, null, 2));
