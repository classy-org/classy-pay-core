'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const Lock = require('./utils/Lock');

const DataSourceManager = require('./DataSourceManager');

class Config {
  constructor(dataSources) {
    this.dataSourceManagers = [];
    this.lock = new Lock();
    for (let dataSource of dataSources) {
      // Allow data sources to call into config reentrant if needed
      this.dataSourceManagers.push(new DataSourceManager(dataSource, {get: key => this._getLocked(key)}));
    }
  }

  async get(key) {
    return await this.lock.lockForPath(async () => {
      return await this._getLocked(key);
    });
  }

  async _getLocked(key) {
    for (let dataSourceManager of this.dataSourceManagers) {
      if (dataSourceManager.querying) {
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
