'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const _ = require('lodash');

class EnvironmentDataSource {
  async initialize() {
    this.dir = process.env.LAMBDA_TASK_ROOT || process.env.PWD;
    const environments = require(`${this.dir}/environment.json`);

    if (process.env.STAGE) {
      this.stage = process.env.STAGE;
    } else if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      this.stage = process.env.AWS_LAMBDA_FUNCTION_NAME.split('-')[2];
    } else {
      this.stage = 'dev';
    }

    this.dryRun = process.env.DRYRUN ? Boolean(process.env.DRYRUN) : false;

    this.environment = environments[this.stage];
  }

  get(key) {
    switch (key) {
      case 'dir':
        return this.dir;
      case 'stage':
        return this.stage;
      case 'dryRun':
        return this.dryRun;
      default:
        return _.get(this.environment, key, null);
    }
    if (key === 'dir') {
      return this.dir;
    }
  }
}

module.exports = new EnvironmentDataSource;
