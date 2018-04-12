'use strict';
require('regenerator-runtime/runtime');
const Once = require('./utils/Once');

class DataSourceManager {
  constructor(dataSource, config) {
    if (!dataSource) {
      throw new Error('Cannot construct DataSourceManager with null data source');
    }

    this.dataSource = dataSource;
    this.config = config;
  }

  _init() {
    if (!this.once) {
      this.initializing = true;
      this.once = new Once(async () => {
        await this.dataSource.initialize(this.config);
        this.initializing = false;
      });
    }
    return this.once.do();
  }

  async get(key) {
    await this._init();
    return this.dataSource.get(key);
  }

  legacy() {
    return {
      initialize: () => {
        return this._init();
      },
      get: key => {
        if (!this.once.done) {
          throw new Error('Cannot call legacy().get() before calling legacy().initialize()');
        }
        return this.dataSource.get(key);
      }
    };
  }
}

module.exports = DataSourceManager;
