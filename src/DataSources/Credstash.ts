require('source-map-support').install();

import Credstash = require('nodecredstash');
import fs = require('fs');

import { DataSource, DataSourceConfig } from '../DataSource';
import { throttledRetrier } from '../utils/throttledRetrier';

const isCredstashKey = (key: string) => /^[A-Z0-9_]+$/.test(key);
const stringToBool = (result: string) => (result === 'true' || result === 'false') ? result === 'true' : result;

interface NodeCredstashError extends Error {
  code?: string;
}

class CredstashDataSource extends DataSource {
  private getImpl: (key: string) => Promise<any> = (key: string) => Promise.resolve(undefined);
  private devCreds: { [index: string]: any|undefined } = {};

  public async initialize(config: DataSourceConfig) {
    if (await config.get('stage') === 'dev') {
      if (fs.existsSync(`${await config.get('dir')}/creds.json`)) {
        this.devCreds = require(`${await config.get('dir')}/creds.json`);
        this.getImpl = async key => (this.devCreds[key]);
      }
    } else {
      const credstash = Credstash({
        table: [await config.get('stage'), 'pay', 'credstash'].join('-'),
        awsOpts: {
          region: await config.get('aws.region'),
        },
      });
      this.getImpl = throttledRetrier(async key => stringToBool(await credstash.getSecret({name: key})), {
        isErrorRetryableFunc: (error: NodeCredstashError) => error.code === 'ProvisionedThroughputExceededException',
      });
    }
  }

  public async get(key: string): Promise<any> {
    return isCredstashKey(key) ? await this.getImpl(key) : undefined;
  }

  public name(): string {
    return 'Credstash';
  }
}

module.exports = new CredstashDataSource();
