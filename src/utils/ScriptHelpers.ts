// tslint:disable max-classes-per-file
import Config from '../Config';
import DataSource, {DataSourceConfig} from '../DataSource';
import Getopt = require('node-getopt');
import _ = require('lodash');
import Bluebird = require('bluebird');
import mysql = require('mysql');
import {Readable, Writable, Duplex} from 'stream';
import fs = require('fs');
const yamljs = require('yamljs');

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

  const argStage: string = <string> _.get(opt.options, 'stage', 'int');
  if (_.includes(['int', 'staging', 'prod'], argStage) === false) {
    throw new Error(`Invalid stage ${argStage}`);
  }
  const stage: string = argStage;

  switch (stage) {
    case 'int':
    case 'staging':
      // tslint:disable-next-line no-string-literal
      process.env['AWS_PROFILE'] = 'classy-test';
      break;
    case 'prod':
      // tslint:disable-next-line no-string-literal
      process.env['AWS_PROFILE'] = 'prod-pay';
      break;
  }

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
      private dir = process.env.PWD;
      private environment?: object;

      public async initialize(config: DataSourceConfig): Promise<void> {
        const environment = {};

        const envJSONFile = `${this.dir}/environment.json`;
        if (fs.existsSync(envJSONFile)) {
          const jsonEnvironments = require(envJSONFile);
          if (jsonEnvironments) {
            _.merge(environment, jsonEnvironments[stage]);
          }
        }

        const envYAMLFile = `${this.dir}/env.yml`;
        if (fs.existsSync(envYAMLFile)) {
          const yamlEnvironments = yamljs.load(envYAMLFile);
          if (yamlEnvironments) {
            _.merge(environment, yamlEnvironments[stage]);
          }
        }

        this.environment = environment;
      }

      public async get(key: string): Promise<any> {
        switch (key) {
          case 'stage':
            return stage;
          case 'dryRun':
            return dryRun;
          case 'args':
            return opt.argv;
          case 'dir':
            return this.dir;
        }

        return _.get(this.environment, key, null);
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
    // tslint:disable-next-line no-console
    console.error(e);
  });
};

export type PipeSetupFunction = (
  config: Config,
  args: Array<string>,
  source: Readable|undefined,
  transforms: Array<Duplex>,
  sink: Writable|undefined) => Promise<void>;

export const runPipes = (
  setup: PipeSetupFunction,
  source: Readable|undefined,
  transforms: Array<Duplex>,
  sink: Writable|undefined = undefined,
  teardown: ScriptFunction = async () => {},
  argDescription: string = '',
  argValidator: ValidateArgsFunction = args => undefined,
): void => {
  runScript(async (config, args) => {
    await new Promise(async (resolve, reject) => {
      let called = false;
      try {
        for (let i = 0; i < transforms.length; i++) {
          if (i === 0) {
            if (source) {
              source.pipe(transforms[i]);
            }
          } else {
            transforms[i - 1].pipe(transforms[i]);
          }
        }
        let finalStream: Writable = transforms[transforms.length - 1];
        if (sink) {
          finalStream = sink;
          transforms[transforms.length - 1].pipe(sink);
        }
        finalStream.on('finish', () => {
          if (!called) {
            called = true;
            resolve();
          }
        });
        await setup(config, args, source, transforms, sink);
      } catch (e) {
        if (!called) {
          called = true;
          reject(e);
        }
      }
    });
    await teardown(config, args);
  },  argDescription, argValidator);
};
