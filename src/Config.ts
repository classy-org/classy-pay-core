require('source-map-support').install();

import Lock from './utils/Lock';
import DataSourceManager from './DataSourceManager';
import DataSource from './DataSource';

export class Config {
  private dataSourceManagers: Array<DataSourceManager> = [];
  private lock: Lock = new Lock();

  constructor(dataSources: Array<DataSource>) {
    for (const dataSource of dataSources) {
      // Allow data sources to call into config reentrant if needed
      this.dataSourceManagers.push(new DataSourceManager(dataSource, {get: key => this._getLocked(key)}));
    }
  }

  public async get(key: string): Promise<any> {
    return await this.lock.lockForPath(async () => {
      return await this._getLocked(key);
    });
  }

  private async _getLocked(key: string): Promise<any> {
    for (const dataSourceManager of this.dataSourceManagers) {
      if (dataSourceManager.getQuerying()) {
        return null;
      }
      const value = await dataSourceManager.get(key);
      if (value) {
        return value;
      }
    }
    return null;
  }
}

export default Config;
