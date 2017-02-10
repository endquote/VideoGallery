// Scan for Bluetooth LE devices
const noble = require('noble');

noble.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    noble.startScanning([], false);
  }
});

noble.on('discover', (peripheral) => {
  console.log(peripheral.address, peripheral.advertisement.localName);
});
