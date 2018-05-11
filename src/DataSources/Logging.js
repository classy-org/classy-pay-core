'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const bunyan = require('bunyan');

class LoggingDataSource {
  async initialize(config) {
    if (await config.get('log')) {
      const level = await config.get('log.level');
      this.Logger = {
        create: (name) => {
          return bunyan.createLogger({
            name: name,
            level: level || 'info',
            streams: [{
              stream: process.stdout
            }]
          });
        }
      };
    }
  }

  get(key) {
    return key === 'Logger' ? this.Logger : undefined;
  }
}

module.exports = new LoggingDataSource;
