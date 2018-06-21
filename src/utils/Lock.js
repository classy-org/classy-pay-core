'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();
const CountingLock = require('./CountingLock');

class Lock extends CountingLock {
  constructor() {
    super(1);
  }
}

module.exports = Lock;
