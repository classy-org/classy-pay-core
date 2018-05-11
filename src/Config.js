'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

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
      if (dataSourceManager.querying) {
        // Data sources should not be able to call get reentrant
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
