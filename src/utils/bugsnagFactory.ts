require('source-map-support').install();

import * as bugsnag from 'bugsnag';
import * as _ from 'lodash';

const { v1: uuidv1 } = require('uuid');


import Once from './Once';

const process = require('process');

interface BugsnagFactoryConfiguration {
  appName: string;
  key: string;
  releaseStage: string;
}

let globalParameters: BugsnagFactoryConfiguration|undefined;
let initializeOnce: Once|undefined;

export const initialize = async (appName: string, key: string, releaseStage: string) => {
  if (globalParameters) {
    if (!_.isEqual(globalParameters, {appName, key, releaseStage})) {
      throw Error(`Bugsnag was already configured one way; you cannot reconfigure it differently`);
    }
  } else {
    globalParameters = {appName, key, releaseStage};
  }

  if (!initializeOnce) {
    initializeOnce = new Once(async () => {
      // Set up bugsnag
      const options: bugsnag.ConfigurationOptions = {
        releaseStage,
        sendCode: true,
        metaData: {
          revision: process.env.BB_COMMIT,
          errorId: uuidv1(),
        },
        filters: ['cvv', 'lastName', 'address1', 'address2', 'address3', 'address4', 'email', 'token',
        'city', 'state', 'province', 'zip', 'phone', 'birth_month', 'birth_day', 'birth_year',
        'signature', 'accountNumber', 'routingNumber', 'ssn'],
      };
      if (appName) {
        options.appType = appName;
      }
      for (const x of process.listeners('uncaughtException')) {
        process.removeListener('uncaughtException', x);
      }
      bugsnag.register(key, options);
      process.on('uncaughtException', (err: any) => {
        bugsnag.notify(err);
      });
      process.on('unhandledRejection', (reason: any, p: any) => {
        bugsnag.notify(reason);
      });
    });
  }
  await initializeOnce.do();
};
