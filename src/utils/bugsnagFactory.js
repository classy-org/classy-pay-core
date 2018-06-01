'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const Once = require('./Once');
const bugsnag = require('bugsnag');
const uuidv1 = require('uuid/v1');
const _ = require('lodash');

let globalParameters;

const initialize = async (appName, key, releaseStage) => {
  if (globalParameters) {
    if (!_.isEqual(globalParameters, {appName, key, releaseStage})) {
      throw Error(`Bugsnag was already configured one way; you cannot reconfigure it differently`);
    }
  } else {
    globalParameters = {appName, key, releaseStage};
  }

  if (!initialize.once) {
    initialize.once = new Once(async () => {
      // Set up bugsnag
      const options = {
        releaseStage,
        sendCode: true,
        metaData: {
          revision: process.env.BB_COMMIT,
          errorId: uuidv1()
        },
        filters: ['cvv', 'lastName', 'address1', 'address2', 'address3', 'address4', 'email', 'token',
        'city', 'state', 'province', 'zip', 'phone', 'birth_month', 'birth_day', 'birth_year',
        'signature', 'accountNumber', 'routingNumber', 'ssn']
      };
      if (appName) {
        options.appType = appName;
      }
      for (let x of process.listeners('uncaughtException')) {
        process.removeListener('uncaughtException', x);
      }
      bugsnag.register(key, options);
      process.on('uncaughtException', (err) => {
        bugsnag.notify(err);
      });
      process.on('unhandledRejection', (reason, p) => {
        bugsnag.notify(reason);
      });
    });
  }
  await initialize.once.do();
};

module.exports = async (appName, key, releaseStage) => {
  await initialize(appName, key, releaseStage);
  return bugsnag;
};
