const sinon = require('sinon');
const should = require('should');
require('should-sinon');
const Promise = require('bluebird');
const _ = require('lodash');
const CountingLock = require('../../src/utils/CountingLock');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const width = 5;

describe('CountingLock', () => {
  let lock;

  beforeEach(() => {
    lock = new CountingLock(width);
  });

  afterEach(() => {
    lock = null;
  });

  it('Locked code doesn\'t execute concurrently beyond width', async () => {
    const nConcurrentPromises = 15;
    const promiseRunning = _.map(_.range(nConcurrentPromises), () => false);
    const promiseAtIndex = async index => {
      promiseRunning[index] = true;

      let nRunningPromises = 0;
      for (const p of promiseRunning) {
        if (p) {
          nRunningPromises++;
        }
      }
      nRunningPromises.should.be.lessThanOrEqual(width);

      await sleep(0.2);
      promiseRunning[index] = false;
    };
    await Promise.all(_.map(_.range(nConcurrentPromises), i => lock.lockForPath(() => (promiseAtIndex(i)))));
  });

  it('More than one thing can run at a time', async () => {
    const nConcurrentPromises = 15;
    const promiseRunning = _.map(_.range(nConcurrentPromises), () => false);
    const runningPromisesSamples = [];
    const promiseAtIndex = async index => {
      promiseRunning[index] = true;

      let nRunningPromises = 0;
      for (const p of promiseRunning) {
        if (p) {
          nRunningPromises++;
        }
      }
      runningPromisesSamples.push(nRunningPromises);

      await sleep(0.2);
      promiseRunning[index] = false;
    };
    await Promise.all(_.map(_.range(nConcurrentPromises), i => lock.lockForPath(() => (promiseAtIndex(i)))));
    let largest = 0;
    for (const sample of runningPromisesSamples) {
      if (sample > largest) {
        largest = sample;
      }
    }
    largest.should.be.equal(width);
  });

  it('Exceptions propagated to caller', async () => {
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
    const promises = [];
    promises[0] = lock.lockForPath(async () => {
      return 0;
    });
    let myError = new Error();
    promises[1] = lock.lockForPath(async () => {
      throw myError;
    });
    promises[2] = lock.lockForPath(async () => {
      return 2;
    })
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
