// tslint:disable max-classes-per-file
// tslint:disable no-console
import Config from '../Config';
import DataSource, {DataSourceConfig} from '../DataSource';
import Getopt = require('node-getopt');
import _ = require('lodash');
import Bluebird = require('bluebird');
import mysql = require('mysql');

export type ValidateArgsFunction = (args: Array<string>) => string|undefined;
export type ScriptFunction = (config: Config, args: Array<string>) => Promise<void>;

export const runScript = (
  f: ScriptFunction,
  argDescription: string = '',
  argValidator: ValidateArgsFunction = args => undefined): void => {

  // Parse args
  const opt = Getopt.create([
    ['s', 'stage=STAGE'],
    ['d', 'dryRun=DRYRUN'],
  ]).parseSystem();

  const argStage = _.get(opt.options, 'stage', 'int');
  if (_.includes(['int', 'staging', 'prod'], argStage) === false) {
    throw new Error(`Invalid stage ${argStage}`);
  }
  const stage = argStage;

  const argDryRun = <string> _.get(opt.options, 'dryRun', 'true');
  let dryRun = true;
  if (_.toLower(argDryRun) === 'false') {
    dryRun = true;
  }

  // Let script validate args
  const validateArgsResult = argValidator(opt.argv);
  if (validateArgsResult) {
    throw new Error(`Invalid arguments to script: ${validateArgsResult}\n"
      + "usage: ${process.argv[0]} -s|--stage stage [--d|--dryRun dryRun] ${argDescription}`);
  }

  // Generate config
  const config = new Config([
    new class extends DataSource {
      private underlyingEnvironment?: DataSource;

      public async initialize(config: DataSourceConfig): Promise<void> {
        this.underlyingEnvironment = require('../DataSources/Environment');
        if (this.underlyingEnvironment) {
          await this.underlyingEnvironment.initialize(config);
        }
      }

      public async get(key: string): Promise<any> {
        switch (key) {
          case 'stage':
            return stage;
          case 'dryRun':
            return dryRun;
        }
        if (this.underlyingEnvironment) {
          return await this.underlyingEnvironment.get(key);
        }
      }

      public name(): string {
        return 'ScriptEnvironment';
      }
    }(),
    require('../DataSources/Credstash'),
    require('../DataSources/Clients'),
    new class extends DataSource {
      private port?: number;
      private user?: string;
      private password?: string;

      public async initialize(config: DataSourceConfig): Promise<void> {
        let port: number|undefined;
        switch (await config.get('stage')) {
          case 'prod': port = 9306; break;
          case 'staging': port = 8306; break;
        }
        if (port === undefined) {
          throw new Error(`No port for stage ${await config.get('stage')}`);
        }
        this.port = port;

        this.user = await config.get('CLASSY_DB_USERNAME');
        this.password = await config.get('CLASSY_DB_PASSWORD');
      }

      public async get(key: string): Promise<any> {
        if (key === 'stayClassyDB') {
          const db = Bluebird.promisifyAll(mysql.createPool({
            connectionLimit: 25,
            host: '127.0.0.1',
            user: this.user,
            password: this.password,
            database: 'stayclassy',
            port: this.port,
          }));
          return db;
        }

        return undefined;
      }

      public name(): string {
        return 'LocalDBFactories';
      }
    }(),
  ]);

  // Run function
  f(config, opt.argv).catch(e => {
    console.error(e);
  });
};
