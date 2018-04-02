'use strict';
require('regenerator-runtime/runtime');
const _ = require('lodash');
const LambdaContext = require('../utils/LambdaContext');

class EnvironmentDataSource {
  async initialize() {
    if (!LambdaContext.environment) {
      throw Error('Lambda context missing environment.json entry for stage: ' + JSON.stringify(LamdbaContext));
    }
    this.environment = LambdaContext.environment;
  }

  get(key) {
    return _.get(this.environment, key, null);
  }
}

module.exports = new EnvironmentDataSource;
