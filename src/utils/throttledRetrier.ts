require('source-map-support').install();

import _ = require('lodash');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// tslint:disable:no-console
const logError = (errorMessage: string) => console.log(errorMessage);

export type ArbitraryArgsFunction = (...args: any[]) => Promise<any>;
export type SleepAmountFunction = (attemptNumber: number) => number;
export type IsErrorRetryableFunction = (error: Error) => boolean;

export interface ThrottledRetrierOptions {
  maxNumberOfTries?: number;
  sleepAmountFunction?: SleepAmountFunction;
  isErrorRetryableFunc?: IsErrorRetryableFunction;
  disableErrorLogging?: boolean;
}

export const throttledRetrier =
  (func: ArbitraryArgsFunction, options: ThrottledRetrierOptions): ArbitraryArgsFunction => async (...args) => {
    const guaranteedGetOption = <TResult>(key: keyof ThrottledRetrierOptions, defaultValue: TResult): TResult => {
      const retVal = _.get<ThrottledRetrierOptions, keyof ThrottledRetrierOptions, TResult>(
        options,
        key,
        defaultValue,
      );
      if (retVal === null || retVal === undefined) {
        throw new Error(`Couldn't get throttled retrier option ${key} from ${options}`);
      }
      return <TResult> retVal;
    };

    const maxNumberOfTries = guaranteedGetOption<number>('maxNumberOfTries', 5);
    if (maxNumberOfTries <= 1 || maxNumberOfTries > 10) {
      throw new Error(`Throttled retrier's max number of tries must be between 2 and 10, was ${maxNumberOfTries}`);
    }
    const sleepAmountFunction = guaranteedGetOption<SleepAmountFunction>(
      'sleepAmountFunction',
      (attemptNumber: number) => 1000 * attemptNumber,
    );
    const isErrorRetryableFunc = guaranteedGetOption<IsErrorRetryableFunction>(
      'isErrorRetryableFunc',
      error => true,
    );
    const disableErrorLogging = guaranteedGetOption<boolean>(
      'disableErrorLogging',
      false,
    );

    let tries = 0;
    while (true) {
      try {
        return await func(...args);
      } catch (error) {
        tries++;
        if (tries < maxNumberOfTries && isErrorRetryableFunc(error)) {
          const sleepMS = sleepAmountFunction(tries);
          if (!disableErrorLogging) logError(`Hit retryable error, sleeping ${sleepMS} ms (error: ${error})`);
          await sleep(sleepMS);
        } else {
          throw error;
        }
      }
    }
  };

export default throttledRetrier;
