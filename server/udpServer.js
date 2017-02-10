const dgram = require('dgram');
const SocketServer = require('./socketServer');

class UdpServer {
  static init(port = 41234) {
    const server = dgram.createSocket('udp4');

    server.on('error', (err) => {
      console.log(`UDP server error:\n${err.stack}`);
      server.close();
    });

    server.on('message', (msg, rinfo) => {
      console.log(`UDP server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
      SocketServer.emit('controller', `${msg}`);
    });

    server.on('listening', () => {
      const address = server.address();
      console.log(`UDP server listening ${address.address}:${address.port}`);
    });

    server.bind(port);
  }
}

module.exports = UdpServer;
