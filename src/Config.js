'use strict';
require('regenerator-runtime/runtime');
const _ = require('lodash');
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
      let value = await dataSourceManager.get(key);
      if (value) {
        return value;
      }
    }
    return null;
  }

  legacy() {
    return {
      initialize: () => {
        if (!this.initialization) {
          this.initialization = Promise.all(_.map(this.dataSourceManagers, dataSourceManager => {
            return dataSourceManager.legacy().initialize();
          })).then(() => {
            this.initializationDone = true;
          });
        }
        return this.initialization;
      },
      get: (key) => {
        if (!this.initializationDone) {
          throw Error('You must call Config.legacy().initialize() first before using legacyGet()');
        }

        for (let dataSourceManager of this.dataSourceManagers) {
          let value = dataSourceManager.legacy().get(key);
          if (value) {
            return value;
          }
        }
        return null;
      }
    };
  }
};

module.exports = Config;
