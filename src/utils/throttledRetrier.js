'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const _ = require('lodash');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const logError = error => console.log(error);

const throttledRetrier = (func, options) => async (...args) => {
  const maxNumberOfTries = _.get(options, 'maxNumberOfTries', 5);
  if (maxNumberOfTries <= 1 || maxNumberOfTries > 10) {
    throw new Error(`Throttled retrier's max number of tries must be between 2 and 10, was ${maxNumberOfTries}`);
  }
  const sleepAmountFunction = _.get(options, 'sleepAmountFunction', attemptNumber => 1000 * attemptNumber);
  const isErrorRetryableFunc = _.get(options, 'isErrorRetryableFunc', ( /* error */ ) => true);

  let tries = 0;
  while (true) {
    try {
      return await func(...args);
    } catch (error) {
      tries++;
      if (tries < maxNumberOfTries && isErrorRetryableFunc(error)) {
        const sleepMS = sleepAmountFunction(tries);
        logError(`Hit retryable error, sleeping ${sleepMS} ms (error: ${error})`);
        await sleep(sleepMS);
      } else {
        throw error;
      }
    }
  }
};

module.exports = throttledRetrier;
