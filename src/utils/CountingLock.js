'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const _ = require('lodash');

class CountingLock {
  constructor(width=1) {
    this.executing = 0;
    this.waiters = [];
    this.width = width;
  }

  lockForPath(f) {
    const waiter = {f};
    const promise = new Promise((resolve, reject) => {
      waiter.resolve = resolve;
      waiter.reject = reject;
    });
    this.waiters.push(waiter);
    this._execute();
    return promise;
  }

  async _execute() {
    if (this.executing >= this.width) {
      return;
    }
    if (this.waiters.length > 0) {
      this.executing = this.executing + 1;
      const {f, resolve, reject} = this.waiters.shift();
      let value;
      let error;
      try {
        value = await f();
      } catch (e) {
        error = e;
      }

      try {
        if (error) {
          reject(error);
        } else {
          resolve(value);
        }
      } finally {
        this.executing = this.executing - 1;
        if (this.waiters.length > 0) {
          _.defer(() => {
            this._execute();
          });
        }
      }
    }
  }
}

module.exports = CountingLock;
