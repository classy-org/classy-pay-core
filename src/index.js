'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();
const Once = require('./utils/Once');
const _ = require('lodash');
const bugsnag = require('bugsnag');
const uuidv1 = require('uuid/v1');
const LambdaContext = require('./utils/LambdaContext');
const Config = require('./Config');

module.exports = {
  initialize: function() {
    this.once = new Once(async () => {
      // Set up configuration dict
      this.config = new Config([
        require('./DataSources/Environment'),
        require('./DataSources/Credstash'),
        require('./DataSources/Clients'),
        require('./DataSources/Logging'),
        require('./DataSources/Replacer')
      ]);

      // Needed until we are only async/await
      await this.config.legacy().initialize();

      // Set up bugsnag
      const options = {
        releaseStage: LambdaContext.stage,
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
      bugsnag.register(await this.config.get('BUGSNAG_LAMBDAS_KEY'), options);
      process.on('uncaughtException', (err) => {
        bugsnag.notify(err);
      });
      process.on('unhandledRejection', (reason, p) => {
        bugsnag.notify(reason);
      });
    });
    return this.once.do();
  },

  async: function() {
    return {
      get: async () => {
        await this.initialize();
        const value = _.get(this, key, null);
        if (value) {
          return value;
        }
        return await Config.get(key);
      }
    };
  },

  legacy: function() {
    return {
      load: next => {
        this.initialize().then(() => {
           return this.config.legacy().initialize();
         }).then(() => {
          _.defer(next);
        }).catch(error => {
          _.defer(next, error);
        });
      },
      get: (key) => {
        if (!this.once || !this.once.done) {
          throw Error('Must call Common.legacy().load() before calling Common.legacy().get() (or Common.get())');
        }

        const value = _.get(this, key, null);
        if (value) {
          return value;
        }
        return this.config.legacy().get(key);
      }
    };
  },

  load: function(next) {
    // Currently maps to legacy function
    this.legacy().load(next);
  },

  get: function(key) {
    // Currently maps to legacy function
    return this.legacy().get(key);
  }
};
