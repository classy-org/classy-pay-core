'use strict';
require('source-map-support').install();

export interface DataSourceConfig {
  get: (key: string) => any
};

export abstract class DataSource {
  abstract async initialize(config: DataSourceConfig): Promise<void>;
  abstract async get(key: string): Promise<any>;
  abstract name(): string;
}

export default DataSource;
