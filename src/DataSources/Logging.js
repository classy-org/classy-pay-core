'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const bunyan = require('bunyan');

class LoggingDataSource {
  async initialize(config) {
    const name = await config.get('name');
    if (!name) {
      throw new Error('LoggingDataSource requires that another data source provide a \'name\' configuration');
    }
    this.Logger = bunyan.createLogger({
      name,
      level: await config.get('log.level') || 'info',
      streams: [{
        stream: process.stdout
      }]
    });
  }

  get(key) {
    return key === 'Logger' ? this.Logger : undefined;
  }

  name() {
    return 'Logging';
  }
}

module.exports = new LoggingDataSource;
