'use strict';

const AWSConfig = require('./AWSConfig');
const bugsnagFactory = require('../utils/bugsnagFactory');

const handlerGenerator = (handler, appName) => {
  let bugsnag;
  let config;

  return async (event, context) => {
    if (!config) {
      config = new AWSConfig();
    }
    if (!bugsnag) {
      bugsnag = await bugsnagFactory(appName, await config.get('BUGSNAG_LAMBDAS_KEY'), await config.get('stage'));
    }
    try {
      let result = await handler(event, context, config);
      return result;
    } catch (error) {
      bugsnag.notify(error);
      throw error;
    }
  };
};

module.exports = handlerGenerator;
