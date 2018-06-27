'use strict';
require('source-map-support').install();

const Credstash = require('nodecredstash');
const fs = require('fs');

import {DataSource, DataSourceConfig} from '../DataSource';

const isCredstashKey = (key: string) => /^[A-Z0-9_]+$/.test(key);
const stringToBool = (result: string) => (result === 'true' || result === 'false') ? result === 'true' : result;

class CredstashDataSource extends DataSource {
  getImpl: (key: string) => Promise<any> = (key: string) => Promise.resolve(undefined);
  devCreds: { [index: string]: any|undefined } = {};

  async initialize(config: DataSourceConfig) {
    if (await config.get('stage') === 'dev') {
      if (fs.existsSync(`${await config.get('dir')}/creds.json`)) {
        this.devCreds = require(`${await config.get('dir')}/creds.json`);
        this.getImpl = async key => (this.devCreds[key]);
      }
    } else {
      const credstash = new Credstash({
        table: [await config.get('stage'), 'pay', 'credstash'].join('-'),
        awsOpts: {
          region: await config.get('aws.region')
        }
      });
      this.getImpl = async key => stringToBool(await credstash.getSecret({name: key}));
    };
  }

  async get(key: string): Promise<any> {
    return isCredstashKey(key) ? await this.getImpl(key) : undefined;
  };

  name(): string {
    return 'Credstash';
  }
}

module.exports = new CredstashDataSource;
