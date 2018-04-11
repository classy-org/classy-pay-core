'use strict';
require('regenerator-runtime/runtime');
const DataSourceManager = require('./DataSourceManager');
const Once = require('./utils/once');

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

  legacy() {
    return {
      initialize: () => {
        if (!this.initialization) {
          this.initialization = new Once(async () => {
            for (let dataSourceManager of this.dataSourceManagers) {
              await dataSourceManager.legacy().initialize();
            }
            this.initializationDone = true;
          });
        }
        return this.initialization.do();
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
