require('source-map-support').install();

import {DataSource, DataSourceConfig} from '../DataSource';

type ReplacerFunction = (key: string, value: string) => string;

class ReplacerDataSource extends DataSource {
  private replacer?: ReplacerFunction;

  public async initialize(config: DataSourceConfig) {
    if (await config.get('security')) {
      const keys = await config.get('security.obfuscate');
      const replacement = await config.get('security.replacement');

      if (!keys || !replacement) {
        throw Error('You need to fill in both security.obfuscate and security.replacement to use replacer');
      }

      this.replacer = (key, value) => {
        if (keys.includes(key)) {
          return replacement;
        }
        return value;
      };
    }
  }

  public async get(key: string): Promise<ReplacerFunction|undefined> {
    return key === 'Replacer' ? this.replacer : undefined;
  }

  public name(): string {
    return 'Replacer';
  }
}

module.exports = new ReplacerDataSource();
