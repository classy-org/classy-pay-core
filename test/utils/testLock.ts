import should = require('should');
import Promise = require('bluebird');
import _ = require('lodash');

import Lock from '../../src/utils/Lock';
require('should-sinon');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Lock', () => {
  let lock: Lock|undefined;

  beforeEach(() => {
    lock = new Lock();
  });

  afterEach(() => {
    lock = undefined;
  });

  it('Locked code doesn\'t execute concurrently', async () => {
    if (!lock) throw Error('Test wasn\'t set up correctly');
    const l = lock;
    const nConcurrentPromises = 3;
    const promiseRunning = _.map(_.range(nConcurrentPromises), () => false);
    const promiseAtIndex = async (index: number) => {
      for (const p of promiseRunning) {
        if (p) {
          throw Error('Promise already running');
        }
      }
      promiseRunning[index] = true;
      await sleep(0.2);
      promiseRunning[index] = false;
    };
    await Promise.all(_.map(_.range(nConcurrentPromises), i => l.lockForPath(() => (promiseAtIndex(i)))));
  });

  it('Exceptions propagated to caller', async () => {
    if (!lock) throw Error('Test wasn\'t set up correctly');
    let error;
    try {
      await lock.lockForPath(async () => {
        throw new Error();
      });
    } catch (e) {
      error = e;
    }
    should.exist(error);
  });

  it('Exceptions don\'t impact other callers', async () => {
    if (!lock) throw Error('Test wasn\'t set up correctly');
    const promises = [];
    promises[0] = lock.lockForPath(async () => {
      return 0;
    });
    const myError = new Error();
    promises[1] = lock.lockForPath(async () => {
        throw myError;
    });
    promises[2] = lock.lockForPath(async () => {
      return 2;
    });
    const results = [];
    const errors = [];
    let idx = 0;
    for (const promise of promises) {
      results[idx] = null;
      errors[idx] = null;
      try {
        results[idx] = await promise;
      } catch (e) {
        errors[idx] = e;
      }
      idx++;
    }
    results.should.be.eql([0, null, 2]);
    errors.should.be.eql([null, myError, null]);
  });
});
