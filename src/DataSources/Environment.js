'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const _ = require('lodash');
const yamljs = require('yamljs');
const fs = require('fs');

class EnvironmentDataSource {
  async initialize() {
    this.dir = process.env.LAMBDA_TASK_ROOT || process.env.PWD;

    if (process.env.STAGE) {
      this.stage = process.env.STAGE;
    } else if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      this.stage = process.env.AWS_LAMBDA_FUNCTION_NAME.split('-')[2];
    } else {
      this.stage = 'dev';
    }

    this.dryRun = process.env.DRYRUN ? Boolean(process.env.DRYRUN) : false;

    let environment = {};

    const envJSONFile = `${this.dir}/environment.json`;
    if (fs.existsSync(envJSONFile)) {
      const jsonEnvironments = require(envJSONFile);
      if (jsonEnvironments) {
        _.merge(environment, jsonEnvironments[this.stage]);
      }
    }

    const envYAMLFile = `${this.dir}/env.yml`;
    if (fs.existsSync(envYAMLFile)) {
      const yamlEnvironments = yamljs.load(envYAMLFile);
      if (yamlEnvironments) {
        _.merge(environment, yamlEnvironments[this.stage]);
      }
    }

    this.environment = environment;
  }

  async get(key) {
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

  name() {
    return 'Environment';
  }
}

module.exports = new EnvironmentDataSource;
