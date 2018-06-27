'use strict';
require('source-map-support').install();

import Lock from './utils/Lock';
import DataSource, {DataSourceConfig} from './DataSource';

export class DataSourceManager {
  lock: Lock = new Lock();
  dataSource: DataSource;
  config: DataSourceConfig;
  initialized: boolean = false;
  querying: boolean = false;
  cache: { values: { [index: string] : any }, missing: { [index: string] : any } } = {values: {}, missing: {}};

  constructor(dataSource: DataSource, config: DataSourceConfig) {
    if (!dataSource) {
      throw new Error('Cannot construct DataSourceManager with null data source');
    }
    if (!config) {
      throw new Error('Cannot construct DataSource with null config');
    }

    this.dataSource = dataSource;
    this.config = config;
  }

  async _init() {
    if (!this.initialized) {
      await this.dataSource.initialize(this.config);
      this.initialized = true;
    }
  }

  async get(key: string): Promise<any> {
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

export default DataSourceManager;
