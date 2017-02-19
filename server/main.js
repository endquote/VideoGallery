const program = require('commander');
const fs = require('fs-extra-promise');

program
  .version(JSON.parse(fs.readFileSync('package.json')).version)
  .option('--port [8080]', 'web server port', 8080)
  .option('--downloads [./downloads]', 'where to save downloads', '../downloads')
  .option('--database [mongodb://localhost/]', 'database connection', 'mongodb://localhost/')
  .option('--username [username]', 'username', '')
  .option('--password [password]', 'password', '')
  .parse(process.argv);

require('./database').init(program.database);
require('./webServer').init(program.port, program.downloads, program.username, program.password);
require('./socketServer').init();
require('./downloader').init(program.downloads);
require('./powermate').init();
