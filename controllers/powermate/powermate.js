const noble = require('noble');
const SocketServer = require('./socketServer');

// PowerMate connection class.
// Ported from: https://github.com/circuitbeard/node-red-contrib-powermateble/blob/master/src/powermate-device.js
class PowerMate {
  static init() {
    // Constants
    this.SERVICE_UUID = '25598cf7424040a69910080f19f91ebc';
    this.BATTERY_CHAR_UUID = '50f09cc9fe1d4c79a962b3a7cd3e5584';
    this.KNOB_CHAR_UUID = '9cf53570ddd947f3ba6309acefc60415';
    this.LED_CHAR_UUID = '847d189e86ee4bd2966f800832b1259d';

    this.LED_MIN = 161;
    this.LED_MAX = 191;

    this.KNOB_ACTIONS = {
      101: 'nextMode', // release
      102: '', // holdrelease
      103: 'seekBack', // anticlockwise
      104: 'seekForward', // clockwise
      105: '', // holdanticlockwise
      112: '', // holdclockwise
      114: '', // 'hold1',
      115: '', // 'hold2',
      116: '', // 'hold3',
      117: '', // 'hold4',
      118: '', // 'hold5',
      119: '', // 'hold6',
    };

    // Reference to the actual device
    this._peripheral = null;
    this.connected = false;
    this.battery = 0;

    // Defining handlers up front so they can be removed on disconnection.
    this._onDiscoverHandler = this._onDiscover.bind(this);
    this._onStateChangeHandler = this._onStateChange.bind(this);
    this._onConnectHandler = this._onConnect.bind(this);
    this._onDisconnectHandler = this._onDisconnect.bind(this);
    this._onBatteryReadHandler = this._onBatteryRead.bind(this);
    this._onKnobReadHandler = this._onKnobRead.bind(this);

    noble.on('discover', this._onDiscoverHandler);
    noble.on('stateChange', this._onStateChangeHandler);

    setInterval(() => this.emitStatus(), 3000);
  }

  // When Bluetooth comes on, start scanning.
  static _onStateChange(state) {
    if (state === 'poweredOn') {
      console.log('Scanning for PowerMate');
      noble.startScanning([this.SERVICE_UUID], true);
    }
  }

  // When the device is discovered, connct to it.
  static _onDiscover(peripheral) {
    console.log(`Found ${peripheral.advertisement.localName} ${peripheral.address}`);

    this._disconnect();

    this._peripheral = peripheral;

    this._peripheral.on('connect', this._onConnectHandler);
    this._peripheral.on('disconnect', this._onDisconnectHandler);

    this._peripheral.connect((err) => {
      if (err) {
        console.error(err);
      }
    });
  }

  // When the device is connected, subscribe to updates.
  static _onConnect(err) {
    if (err) {
      console.error('PowerMate connection error');
      console.error(err);
      return;
    }

    console.log('PowerMate connected');
    this.connected = true;
    SocketServer.emit('controller', { status: 'connected', type: 'radial' });

    // Discover services and characteristics (filter serial data service)
    const serviceIds = [this.SERVICE_UUID];
    const characteristicIds = [this.BATTERY_CHAR_UUID, this.KNOB_CHAR_UUID, this.LED_CHAR_UUID];
    this._peripheral.discoverSomeServicesAndCharacteristics(
      serviceIds, characteristicIds, (e, services, characteristics) => {
        if (e) {
          console.error(e);
        }

        // Store the service
        this._service = services[0];

        // Store the chars
        this._batteryChar = characteristics.find(c => c.uuid === this.BATTERY_CHAR_UUID);
        this._knobChar = characteristics.find(c => c.uuid === this.KNOB_CHAR_UUID);
        this._ledChar = characteristics.find(c => c.uuid === this.LED_CHAR_UUID);

        // Subscribe to battery
        this._batteryChar.notify(true, () => console.log('Signed up for battery notifications'));
        this._batteryChar.on('read', this._onBatteryReadHandler);

        // Subscribe to knob
        this._knobChar.notify(true, () => console.log('Signed up for knob notifications'));
        this._knobChar.on('read', this._onKnobReadHandler);
      });
  }

  static _onBatteryRead(data) {
    const value = parseInt(data.toString('hex'), 16);
    console.log(`PowerMate battery: ${value}`);
    this.battery = value / 100;
    SocketServer.emit('controller', { battery: value });
  }

  static _onKnobRead(data) {
    const value = parseInt(data.toString('hex'), 16);
    const parsedValue = this.KNOB_ACTIONS[value];
    if (!parsedValue) {
      return;
    }

    // For some reason 'holdRelease' comes in pairs
    if (parsedValue === 'holdrelease' && this._peripheral.lastKnobAction === 'holdrelease') {
      this._peripheral.lastKnobAction = null;
      return;
    }
    this._peripheral.lastKnobAction = parsedValue;

    console.log(`PowerMate knob: ${parsedValue}`);
    SocketServer.emit('controller', { knob: parsedValue });
  }

  // Set LED brightness, 0-100
  static setLedBrightness(level) {
    if (!this._ledChar) {
      return;
    }

    // Map percentage to min/max range
    let mappedLevel = 160;
    if (level >= 0) {
      mappedLevel = Math.round(this._map(level, 0, 100, this.LED_MIN, this.LED_MAX));
    }

    // Write the value
    this._ledChar.write(new Buffer([mappedLevel]), true, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }

  static _map(x, inMin, inMax, outMin, outMax) {
    return (((x - inMin) * (outMax - outMin)) / (inMax - inMin)) + outMin;
  }

  // Clean up on disconnection.
  static _onDisconnect(err) {
    console.log('PowerMate disconnected');
    this.connected = false;
    SocketServer.emit('controller', { status: 'disconnected' });
    if (err) {
      console.error(err);
    }

    this._disconnect();
  }

  // Clean up on disconnection.
  static _disconnect() {
    if (this._peripheral) {
      this._peripheral.removeListener('connect', this._onConnectHandler);
      this._peripheral.removeListener('disconnect', this._onDisconnectHandler);
    }

    if (this._knobChar) {
      this._knobChar.removeListener('read', this._onKnobReadHandler);
    }

    if (this._batteryChar) {
      this._batteryChar.removeListener('read', this._onBatteryReadHandler);
    }

    delete this._peripheral;
    delete this._service;
    delete this._batteryChar;
    delete this._knobChar;
    delete this._ledChar;
  }

  // Turn off scanning.
  static destroy() {
    this._disconnect();
    noble.stopScanning();
    noble.removeListener('stateChange', this._onStateChangeHandler);
    noble.removeListener('discover', this._onDiscoverHandler);
  }

  static emitStatus() {
    SocketServer.emit('controller', { status: this.connected ? 'connected' : 'disconnected' });
    SocketServer.emit('controller', { battery: this.battery });
  }
}

module.exports = PowerMate;
