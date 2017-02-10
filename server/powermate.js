const noble = require('noble');
const SocketServer = require('./socketServer');

// PowerMate connection class.
// Ported from: https://github.com/circuitbeard/node-red-contrib-powermateble/blob/master/src/powermate-device.js
class PowerMate {
  static init() {
    this.SERVICE_UUID = '25598cf7424040a69910080f19f91ebc';
    this.BATTERY_CHAR_UUID = '50f09cc9fe1d4c79a962b3a7cd3e5584';
    this.KNOB_CHAR_UUID = '9cf53570ddd947f3ba6309acefc60415';
    this.LED_CHAR_UUID = '847d189e86ee4bd2966f800832b1259d';

    this.LED_BRIGHTNESS_MIN = 161;
    this.LED_BRIGHTNESS_MAX = 191;

    this._peripheral = null;

    // Defining handlers up front so they can be removed on disconnection.
    this._onDiscoverHandler = this._onDiscover.bind(this);
    this._onStateChangeHandler = this._onStateChange.bind(this);
    this._onConnectHandler = this._onConnect.bind(this);
    this._onDisconnectHandler = this._onDisconnect.bind(this);
    this._onBatteryReadHandler = this._onBatteryRead.bind(this);
    this._onKnobReadHandler = this._onKnobRead.bind(this);

    noble.on('discover', this._onDiscoverHandler);
    noble.on('stateChange', this._onStateChangeHandler);
  }

  // When bluetooth comes on, start scanning.
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
    SocketServer.emit('controller', { status: 'connected' });

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
        for (let i = 0; i < characteristics.length; i += 1) {
          switch (characteristics[i].uuid) {
            case this.BATTERY_CHAR_UUID:
              this._batteryChar = characteristics[i];
              break;
            case this.KNOB_CHAR_UUID:
              this._knobChar = characteristics[i];
              break;
            case this.LED_CHAR_UUID:
              this._ledChar = characteristics[i];
              break;
            default:
          }
        }

        // Subscribe to battery
        this._batteryChar.notify(true, () => console.log('PowerMateBleDevice: Signed up for battery notifications'));
        this._batteryChar.on('read', this._onBatteryReadHandler);

        // Subscribe to knob
        this._knobChar.notify(true, () => console.log('PowerMateBleDevice: Signed up for knob notifications'));
        this._knobChar.on('read', this._onKnobReadHandler);
      });
  }

  static _onBatteryRead(data) {
    const value = parseInt(data.toString('hex'), 16);
    console.log(`PowerMate battery: ${value}`);
    SocketServer.emit('controller', { battery: value });
  }

  static _onKnobRead(data) {
    const value = parseInt(data.toString('hex'), 16);
    let parsedValue;

    switch (value) {
      case 101:
        parsedValue = 'release';
        break;
      case 104:
        parsedValue = 'clockwise';
        break;
      case 103:
        parsedValue = 'anticlockwise';
        break;
      case 114:
      case 115:
      case 116:
      case 117:
      case 118:
      case 119:
        parsedValue = `hold${(value - 113)}`;
        break;
      case 112:
        parsedValue = 'holdClockwise';
        break;
      case 105:
        parsedValue = 'holdAnticlockwise';
        break;
      case 102:
        parsedValue = 'holdRelease';
        break;
      default:
    }

    if (!parsedValue) {
      return;
    }

    console.log(`PowerMate knob: ${parsedValue}`);
    SocketServer.emit('controller', { knob: parsedValue });
  }

  // Clean up on disconnection.
  static _onDisconnect(err) {
    console.log('PowerMate disconnected');
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
}

module.exports = PowerMate;
