'use strict';
require('source-map-support').install();

import Lock from './utils/Lock';
import DataSourceManager from './DataSourceManager';
import DataSource from './DataSource';

export class Config {
  dataSourceManagers: Array<DataSourceManager> = [];
  lock: Lock = new Lock();

  constructor(dataSources: Array<DataSource>) {
    for (let dataSource of dataSources) {
      // Allow data sources to call into config reentrant if needed
      this.dataSourceManagers.push(new DataSourceManager(dataSource, {get: key => this._getLocked(key)}));
    }
  }

  async get(key: string): Promise<any> {
    return await this.lock.lockForPath(async () => {
      return await this._getLocked(key);
    });
  }

  async _getLocked(key: string): Promise<any> {
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

export default Config;
