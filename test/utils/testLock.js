const sinon = require('sinon');
const should = require('should');
require('should-sinon');
const Promise = require('bluebird');
const _ = require('lodash');
const Lock = require('../../src/utils/Lock');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('Lock', () => {
  let lock;

  beforeEach(() => {
    lock = new Lock();
  });

  afterEach(() => {
    lock = null;
  });

  it('Locked code doesn\'t execute concurrently', async () => {
    const nConcurrentPromises = 3;
    const promiseRunning = _.map(_.range(nConcurrentPromises), () => false);
    const promiseAtIndex = async index => {
      for (const p of promiseRunning) {
        if (p) {
          throw Error('Promise already running');
        }
      }
      promiseRunning[index] = true;
      await sleep(0.2);
      promiseRunning[index] = false;
    };
    await Promise.all(_.map(_.range(nConcurrentPromises), i => lock.lockForPath(() => (promiseAtIndex(i)))));
  });
});
