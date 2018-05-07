'use strict';
const DataSourceManager = require('./DataSourceManager');

class Config {
  constructor(dataSources) {
    this.dataSourceManagers = [];
    for (let dataSource of dataSources) {
      this.dataSourceManagers.push(new DataSourceManager(dataSource, this));
    }
  }

  async get(key) {
    for (let dataSourceManager of this.dataSourceManagers) {
      if (dataSourceManager.initializing) {
        // Abort in cases where a data source pulls from config in
        // initialization then reaches the currently-initializing data source.
        return null;
      }
      let value = await dataSourceManager.get(key);
      if (value) {
        return value;
      }
    }
    return null;
  }
};

module.exports = Config;
