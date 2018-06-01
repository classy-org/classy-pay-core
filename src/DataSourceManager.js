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
    this.cache = {values: {}, missing: {}};
  }

  async _init() {
    if (!this.initialized) {
      await this.dataSource.initialize(this.config);
      this.initialized = true;
    }
  }

  async get(key) {
    return await this.lock.lockForPath(async () => {
      this.querying = true;
      try {
        await this._init();
        if (!(key in this.cache.values || key in this.cache.missing)) {
          const value = await this.dataSource.get(key);
          if (value) {
            this.cache.values[key] = value;
          } else {
            this.cache.missing[key] = true;
          }
        }
        return this.cache.values[key];
      } finally {
        this.querying = false;
      }
    });
  }
}

module.exports = DataSourceManager;
