'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const Credstash = require('nodecredstash');
const _ = require('lodash');

const isCredstashKey = key => /^[A-Z_]+$/.test(key);
const stringToBool = result => (result === 'true' || result === 'false') ? result === 'true' : result;

class CredstashDataSource {
  async initialize(config) {
    if (await config.get('stage') === 'dev') {
      this.devCreds = require('fs').existsSync(`${await config.get('dir')}/creds.json`) ? require(`${await config.get('dir')}/creds.json`) : {};
      this._getImpl = async key => this.devCreds[key];
    } else {
      const credstash = new Credstash({
        table: [await config.get('stage'), 'pay', 'credstash'].join('-'),
        awsOpts: {
          region: await config.get('aws.region')
        }
      });
      this._getImpl = async key => stringToBool(await credstash.getSecret({name: key}));
    };
  }

  async get(key) {
    return isCredstashKey(key) ? await this._getImpl(key) : undefined;
  };

  name() {
    return 'Credstash';
  }
}

module.exports = new CredstashDataSource;
