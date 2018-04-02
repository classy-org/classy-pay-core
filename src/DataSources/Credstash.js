'use strict';
require('regenerator-runtime/runtime');
const Credstash = require('nodecredstash');
const _ = require('lodash');
const LambdaContext = require('../utils/LambdaContext');

class CredstashDataSource {
  async initialize(config) {
    this.table = [LambdaContext.stage, 'pay', 'credstash'].join('-');
    this.region = await config.get('aws.region');
    this.keys = _.keys(require(`${LambdaContext.dir}/creds.example.json`));
    this.defaults = require('fs').existsSync(`${LambdaContext.dir}/creds.json`) ? require(`${LambdaContext.dir}/creds.json`) : null;
    this.secrets = config.default;

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
