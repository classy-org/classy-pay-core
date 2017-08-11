'use strict';
const _ = require('lodash');
const _dir = process.env.LAMBDA_TASK_ROOT || process.env.PWD;
const stage = process.env.AWS_LAMBDA_FUNCTION_NAME ?
  process.env.AWS_LAMBDA_FUNCTION_NAME.split('-')[2] : 'dev';
let Config = require('config-lambda')({
  environments: require(`${_dir}/environment.json`),
  stage
});
let Credstash = require('credstash-lambda')({
  table: [stage, 'pay', 'credstash'].join('-'),
  region: Config.get('aws.region'),
  keys: _.keys(require(`${_dir}/creds.example.json`)),
  defaults: require('fs').existsSync(`${_dir}/creds.json`) ?
    require(`${_dir}/creds.json`) : null
});
let Common = {
  loaded: false
};
Common.load = next => {
  if (Common.loaded) {
    next();
  } else {
    Config.load([Credstash], function(error) {
      if (error) {
        next(error);
      } else {
        if (Config.get('log')) {
          Common.Logger = require('./logging')({
            level: Config.get('log.level'),
            token: Config.get('LOG_LOGGLY_TOKEN'),
            subdomain: Config.get('log.loggly.subdomain'),
            tags: Config.get('log.loggly.tags')
          });
        }
        if (Config.get('pay')) {
          Common.PayClient = require('./payClient')({
            apiUrl: Config.get('pay.apiUrl'),
            timeout: Config.get('pay.timeout'),
            token: Config.get('PAY_TOKEN'),
            secret: Config.get('PAY_SECRET')
          });
        }
        if (Config.get('api')) {
          Common.ApiClient = require('./apiClient')({
            clientId: Config.get('APIV2_CLIENT_ID'),
            clientSecret: Config.get('APIV2_CLIENT_SECRET'),
            oauthUrl: Config.get('api.oauthUrl'),
            apiUrl: Config.get('api.apiUrl'),
            timeout: Config.get('api.timeout')
          });
        }
        if (Config.get('security')) {
          Common.Replacer = require('./replacer')({
            keys: Config.get('security.obfuscate'),
            replacement: Config.get('security.replacement')
          });
        }
        Common.loaded = true;
        next();
      }
    });
  }
};
Common.get = key => {
  let value = _.get(Common, key, null);
  if (value) {
    return value;
  }
  return Config.get(key);
};
module.exports = Common;
