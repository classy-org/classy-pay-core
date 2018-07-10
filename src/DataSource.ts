'use strict';
require('source-map-support').install();

export interface DataSourceConfig {
  get: (key: string) => any;
}

export abstract class DataSource {
  public abstract async initialize(config: DataSourceConfig): Promise<void>;
  public abstract async get(key: string): Promise<any>;
  public abstract name(): string;
}

export default DataSource;
