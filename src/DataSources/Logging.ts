require('source-map-support').install();

import * as Logger from 'bunyan';

import {DataSource, DataSourceConfig} from '../DataSource';

class LoggingDataSource extends DataSource {
  private logger?: Logger;

  public async initialize(config: DataSourceConfig) {
    const name = await config.get('name');
    if (!name) {
      throw new Error('LoggingDataSource requires that another data source provide a \'name\' configuration');
    }
    this.logger = Logger.createLogger({
      name,
      level: await config.get('log.level') || 'info',
      streams: [{
        stream: process.stdout,
      }],
    });
  }

  public async get(key: string): Promise<Logger|undefined> {
    return key === 'Logger' ? this.logger : undefined;
  }

  public name(): string {
    return 'Logging';
  }
}

module.exports = new LoggingDataSource();
