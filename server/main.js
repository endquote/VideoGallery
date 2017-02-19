const program = require('commander');
const fs = require('fs-extra-promise');

const Database = require('./database');
const WebServer = require('./webServer');
const SocketServer = require('./socketServer');
const Downloader = require('./downloader');
const PowerMate = require('./powermate');

program
  .version(JSON.parse(fs.readFileSync('package.json')).version)
  .option('--port [8080]', 'web server port', 8080)
  .option('--downloads [./downloads]', 'where to save downloads', '../downloads')
  .option('--database [mongodb://localhost/]', 'database connection', 'mongodb://localhost/')
  .option('--username [username]', 'username', '')
  .option('--password [password]', 'password', '')
  .parse(process.argv);


Database.init(program.database);
WebServer.init(program.port, program.downloads, program.username, program.password);
SocketServer.init();
Downloader.init(program.downloads);
PowerMate.init();
Database.cleanup();
