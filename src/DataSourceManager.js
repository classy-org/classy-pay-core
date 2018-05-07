'use strict';
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
}

module.exports = DataSourceManager;
