'use strict';
require('regenerator-runtime/runtime');
const Credstash = require('nodecredstash');
const _ = require('lodash');

class CredstashDataSource {
  async initialize(config) {
    this.table = [await config.get('stage'), 'pay', 'credstash'].join('-');
    this.region = await config.get('aws.region');
    this.keys = _.keys(require(`${await config.get('dir')}/creds.example.json`));
    this.defaults = require('fs').existsSync(`${await config.get('dir')}/creds.json`) ? require(`${await config.get('dir')}/creds.json`) : null;
    this.secrets = await config.get('defaultSecrets');

    let loadingSecrets = {};
    let credstash = new Credstash({
      table: this.table,
      awsOpts: {
        region: this.region
      }
    });

    function stringToBool(result) {
      return (result === 'true' || result === 'false') ? result === 'true' : result;
    }

    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[i];
      try {
        let secret = await credstash.getSecret({name: key});
        loadingSecrets[key] = stringToBool(secret);
      } catch (error) {
        const containingError = new Error(`Unable to load key "${key}" from credstash`);
        containingError.originalError = error;
        throw containingError;
      }
    }

    this.secrets = _.merge(this.secrets, loadingSecrets);
  }

  get(key) {
    return _.get(this.secrets, key, null);
  }
}

module.exports = new CredstashDataSource;
