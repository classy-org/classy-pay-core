require('source-map-support').install();

const { promisify } = require('util');
import * as AWSLambda from 'aws-lambda';
import * as bugsnag from 'bugsnag';

import * as BugsnagFactory from '../utils/bugsnagFactory';
import { Once } from '../utils/Once';
import { AWSConfig } from './AWSConfig';
import { Config } from '../Config';

export type ClassyAWSHandler = (event: any, context: AWSLambda.Context, config: Config) => any;

export const handlerGenerator = (handler: ClassyAWSHandler, appName: string) => {
  let config: Config;

  const once = new Once(async () => {
    config = new AWSConfig(appName);
    const bugsnagEnabled = await config.get('bugsnagEnabled');

    if (bugsnagEnabled) {
      await BugsnagFactory.initialize(appName, await config.get('BUGSNAG_LAMBDAS_KEY'), await config.get('stage'));
    }
  });

  return (event: any, context: AWSLambda.Context, callback: AWSLambda.Callback<any>) => {
    // We want our handlers to be async/await, but AWS cooperates better with callbacks
    (async () => {
      let result = null;
      let error = null;
      try {
        await once.do();
        result = await handler(event, context, config);
      } catch (e) {
        error = e.toString() === '[object Object]' ? new Error(JSON.stringify(e)) : e;
        if (await config.get('bugsnagEnabled')) {
          await promisify(bugsnag.notify)(error);
        }
      } finally {
        callback(error, result);
      }
    })();
  };
};

export default handlerGenerator;
