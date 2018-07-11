require('source-map-support').install();

import {DataSource, DataSourceConfig} from '../DataSource';

class NameDataSource extends DataSource {
  private _name: string;

  constructor(name: string) {
    super();
    if (!name) {
      throw new Error('Cannot create NameDataSource with no name');
    }
    this._name = name;
  }

  public async initialize(config: DataSourceConfig) {
  }

  public async get(key: string): Promise<string|undefined> {
    return key === 'name' ? this._name : undefined;
  }

  public name(): string {
    return 'Name';
  }
}

module.exports = (name: string) => new NameDataSource(name);
