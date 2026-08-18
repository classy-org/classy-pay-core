require('source-map-support').install();

import * as Logger from 'bunyan';

import {DataSource, DataSourceConfig} from '../DataSource';

type ReplacerFunction = (record: any) => any;

class LoggingDataSource extends DataSource {
  private logger?: Logger;

  public async initialize(config: DataSourceConfig) {
    const name = await config.get('name');
    if (!name) {
      throw new Error('LoggingDataSource requires that another data source provide a \'name\' configuration');
    }

    // When the Replacer data source provides a record-level redaction
    // transform (built from security.obfuscate/security.replacement), apply it
    // to every log record via a raw stream. Bunyan serializers only fire for
    // registered top-level keys, so a raw stream is the only way to redact
    // arbitrary keys at any depth. Without a replacer, keep the historical
    // plain stdout stream.
    const replacer: ReplacerFunction|undefined = await config.get('Replacer');
    const level = await config.get('log.level') || 'info';

    this.logger = Logger.createLogger({
      name,
      level,
      streams: [
        replacer ? {
          type: 'raw',
          stream: {
            write: (record: any) =>
              process.stdout.write(`${JSON.stringify(replacer(record), Logger.safeCycles())}\n`),
          } as any,
        } : {
          stream: process.stdout,
        },
      ],
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
