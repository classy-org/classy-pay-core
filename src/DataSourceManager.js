'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const Lock = require('./utils/Lock');

class DataSourceManager {
  constructor(dataSource, config) {
    if (!dataSource) {
      throw new Error('Cannot construct DataSourceManager with null data source');
    }

    this.lock = new Lock();
    this.dataSource = dataSource;
    this.config = config;
    this.initialized = false;
    this.querying = false;
  }

  async _init() {
    if (!this.initialized) {
      await this.dataSource.initialize(this.config);
      this.initialized = true;
    }
  }

  async get(key) {
    return this.lock.lockForPath(async () => {
      this.querying = true;
      try {
        await this._init();
        return this.dataSource.get(key);
      } finally {
        this.querying = false;
      }
    });
  }
}

module.exports = DataSourceManager;
