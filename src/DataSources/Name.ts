'use strict';
require('source-map-support').install();

import {DataSource, DataSourceConfig} from '../DataSource';

class NameDataSource extends DataSource {
  _name: string;

  constructor(name: string) {
    super();
    if (!name) {
      throw new Error('Cannot create NameDataSource with no name');
    }
    this._name = name;
  }

  async initialize(config: DataSourceConfig) {
  }

  async get(key: string): Promise<string|undefined> {
    return key === 'name' ? this._name : undefined;
  }

  name(): string {
    return 'Name';
  }
}

module.exports = (name: string) => new NameDataSource(name);
