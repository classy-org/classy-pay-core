require('source-map-support').install();

import {DataSource, DataSourceConfig} from '../DataSource';
import {redact} from '../utils/utils';

type ReplacerFunction = (keyOrRecord: any, value?: any) => any;

class ReplacerDataSource extends DataSource {
  private replacer?: ReplacerFunction;

  public async initialize(config: DataSourceConfig) {
    if (await config.get('security')) {
      const keys = await config.get('security.obfuscate');
      const replacement = await config.get('security.replacement');

      if (!keys || !replacement) {
        throw Error('You need to fill in both security.obfuscate and security.replacement to use replacer');
      }

      // Backwards compatible with the original (key, value) => string
      // signature: with two arguments, redacts the single key/value pair and
      // returns the (possibly censored) value. With one argument, acts as a
      // record-level transform that deep-redacts the configured keys (merged
      // with the default key list inside redact()) anywhere in the record.
      this.replacer = (keyOrRecord: any, value?: any) => {
        if (value !== undefined) {
          return redact({ [keyOrRecord]: value }, keys, replacement)[keyOrRecord];
        }
        return redact(keyOrRecord, keys, replacement);
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
