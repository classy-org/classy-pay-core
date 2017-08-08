'use strict';
const _ = require('lodash');
const stage = process.env.AWS_LAMBDA_FUNCTION_NAME ?
  process.env.AWS_LAMBDA_FUNCTION_NAME.split('-')[2] : 'dev';
let Config = require('config-lambda')({
  environments: require(`${process.env.LAMBDA_TASK_ROOT ||
    process.env.PWD}/environment.json`),
  stage
});
let Credstash = require('credstash-lambda')({
  table: [stage, 'pay', 'credstash'].join('-'),
  region: Config.get('aws.region'),
  keys: _.keys(require(`${process.env.LAMBDA_TASK_ROOT ||
    process.env.PWD}/creds.example.json`)),
  defaults: require('fs')
    .existsSync(`${process.env.LAMBDA_TASK_ROOT ||
      process.env.PWD}/creds.json`) ?
    require(`${process.env.LAMBDA_TASK_ROOT ||
      process.env.PWD}/creds.json`) : null
});
let Common = {};
Common.load = next => {
  Config.load([Credstash], function(error) {
    if (error) {
      next(error);
    } else {
      Common.Logger = require('./logging')({
        level: Config.get('log.level'),
        token: Config.get('LOG_LOGGLY_TOKEN'),
        subdomain: Config.get('log.loggly.subdomain'),
        tags: Config.get('log.loggly.tags')
      });
      Common.PayClient = require('./payClient')({
        apiUrl: Config.get('pay.apiUrl'),
        timeout: Config.get('pay.timeout'),
        token: Config.get('PAY_TOKEN'),
        secret: Config.get('PAY_SECRET')
      });
      next();
    }
  });
};
Common.get = key => {
  let value = _.get(Common, key, null);
  if (value) {
    return value;
  }
  return Config.get(key);
};
module.exports = Common;
