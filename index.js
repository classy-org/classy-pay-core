'use strict';
const _ = require('lodash');
const bugsnag = require('bugsnag');
const uuidv1 = require('uuid/v1');
const _dir = process.env.LAMBDA_TASK_ROOT || process.env.PWD;
const stage = process.env.AWS_LAMBDA_FUNCTION_NAME ?
  process.env.AWS_LAMBDA_FUNCTION_NAME.split('-')[2] : 'dev';

let Config = null;
let Credstash = null;
let Common = {
  loaded: false
};

function init(options) {
  if (!Config) {
    Config = require('config-lambda')({
      environments: require(`${_dir}/environment.json`),
      stage
    });
  }
  if (!Credstash) {
    let creds = _.get(options, "creds");
    if (!creds &&  require('fs').existsSync(`${_dir}/creds.json`)) {
      creds = require(`${_dir}/creds.json`);
    }

    Credstash = require('credstash-lambda')({
      table: [stage, 'pay', 'credstash'].join('-'),
      region: Config.get('aws.region'),
      keys: _.keys(require(`${_dir}/creds.example.json`)),
      defaults: creds
    });
  }

}

Common.load = (next, initOptions) => {
  init(initOptions);
  if (Common.loaded) {
    next();
  } else {
    Config.load([Credstash], function(error) {
      if (error) {
        next(error);
      } else {
        const options = {
          releaseStage: stage,
          sendCode: true,
          metaData: {
            revision: process.env.BB_COMMIT,
            errorId: uuidv1()
          },
          filters: ['cvv', 'lastName', 'address1', 'address2', 'address3', 'address4', 'email', 'token',
            'city', 'state', 'province', 'zip', 'phone', 'birth_month', 'birth_day', 'birth_year',
            'signature', 'accountNumber', 'routingNumber', 'ssn']
        };
        for (let x of process.listeners('uncaughtException')) {
          process.removeListener('uncaughtException', x);
        }
        bugsnag.register(Config.get('BUGSNAG_LAMBDAS_KEY'), options);
        process.on('uncaughtException', (err) => {
          bugsnag.notify(err);
        });
        process.on('unhandledRejection', (reason, p) => {
          bugsnag.notify(reason);
        });
        if (Config.get('log') && !Common.Logger) {
          if (initOptions.logger) {
            Common.Logger = initOptions.logger;
          } else {
            Common.Logger = require('./logging')({
              level: Config.get('log.level')
            });
          }
        }
        if (Config.get('pay') && !Common.PayClient) {
          if (initOptions.payClient) {
            Common.PayClient = initOptions.payClient;
          } else {
            Common.PayClient = require('classy-pay-client')({
              apiUrl: Config.get('pay.apiUrl'),
              timeout: Config.get('pay.timeout'),
              token: Config.get('PAY_TOKEN'),
              secret: Config.get('PAY_SECRET')
            });
          }
        }
        if (Config.get('api') && !Common.ApiClient) {
          if (initOptions.apiClient) {
            Common.ApiClient = initOptions.apiClient;
          } else {
            Common.ApiClient = require('classy-api-client')({
              clientId: Config.get('APIV2_CLIENT_ID'),
              clientSecret: Config.get('APIV2_CLIENT_SECRET'),
              timeout: Config.get('api.timeout'),
              oauthUrl: Config.get('api.oauthUrl'),
              apiUrl: Config.get('api.apiUrl')
            });
          }
        }
        if (Config.get('security') && !Common.Replacer) {
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
  init();
  let value = _.get(Common, key, null);
  if (value) {
    return value;
  }
  return Config.get(key);
};
Common.dir = () => {
  return _dir;
};
module.exports = Common;
