const program = require('commander');
const fs = require('fs-extra');

program
  .version(JSON.parse(fs.readFileSync('package.json')).version)
  .option('--port [8080]', 'web server port', 8080)
  .option('--downloads [./downloads]', 'where to save downloads', '../downloads')
  .option('--database [mongodb://localhost/]', 'database connection', 'mongodb://localhost/')
  .parse(process.argv);

require('./database').init(program.database);
require('./webServer').init(program.port, program.downloads);
require('./socketServer').init();
require('./downloader').init(program.downloads);
require('./udpServer').init();
