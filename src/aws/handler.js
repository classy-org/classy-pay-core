'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const {promisify} = require('util');

const Once = require('../utils/Once');

const AWSConfig = require('./AWSConfig');
const bugsnagFactory = require('../utils/bugsnagFactory');

const handlerGenerator = (handler, appName) => {
  let bugsnag;
  let config;

  let once = new Once(async () => {
    config = new AWSConfig(appName);
    bugsnag = await bugsnagFactory(appName, await config.get('BUGSNAG_LAMBDAS_KEY'), await config.get('stage'));
  });

  return (event, context, callback) => {
    // We want our handlers to be async/await, but AWS cooperates better with callbacks
    (async () => {
      let result = null;
      let error = null;
      try {
        await once.do();
        result = await handler(event, context, config);
      } catch (e) {
        error = e.toString() === '[object Object]' ? new Error(JSON.stringify(e)) : e;
        await promisify(bugsnag.notify)(error);
      } finally {
        callback(error, result);
      }
    })();
  };
};

module.exports = handlerGenerator;
