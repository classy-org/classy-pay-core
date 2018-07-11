require('source-map-support').install();

import * as _ from 'lodash';
const yamljs = require('yamljs');
const fs = require('fs');

import {DataSource, DataSourceConfig} from '../DataSource';

class EnvironmentDataSource extends DataSource {
  private dir?: string = process.env.PWD;
  private stage: string = 'dev';
  private dryRun: boolean = false;
  private environment?: object;

  public async initialize(config: DataSourceConfig) {
    this.dir = process.env.LAMBDA_TASK_ROOT || this.dir;

    if (process.env.STAGE) {
      this.stage = process.env.STAGE;
    } else if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      this.stage = process.env.AWS_LAMBDA_FUNCTION_NAME.split('-')[2];
    }

    this.dryRun = process.env.DRYRUN ? Boolean(process.env.DRYRUN) : this.dryRun;

    const environment = {};

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

  public async get(key: string): Promise<any> {
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

  public name(): string {
    return 'Environment';
  }
}

module.exports = new EnvironmentDataSource();
