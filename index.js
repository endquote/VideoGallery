const program = require('commander');
const fs = require('fs-extra');

program
  .version(JSON.parse(fs.readFileSync('package.json')).version)
  .option('--port [8080]', 'web server port', 8080)
  .option('--downloads [./downloads]', 'where to save downloads', './downloads')
  .option('--database [mongodb://localhost/]', 'database connection', 'mongodb://localhost/')
  .parse(process.argv);

require('./server/database').init(program.database);
require('./server/webServer').init(program.port);
require('./server/socketServer').init();
require('./server/downloader').init(program.downloads);
