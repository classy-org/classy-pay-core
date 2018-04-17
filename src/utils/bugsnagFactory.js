'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();
const Once = require('./Once');
const Common = require('../index').async();
const bugsnag = require('bugsnag');
const uuidv1 = require('uuid/v1');

const initialize = async appName => {
  if (!initialize.once) {
    initialize.once = new Once(async () => {
      // Set up bugsnag
      const options = {
        releaseStage: await Common.get('stage'),
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
      bugsnag.register(await Common.get('BUGSNAG_LAMBDAS_KEY'), options);
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

module.exports = async (appName) => {
  await initialize(appName);
  return bugsnag;
};
