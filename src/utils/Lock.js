const _ = require('lodash');

class Lock {
  constructor() {
    this.executing = false;
    this.waiters = [];
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
    if (this.executing) {
      return;
    }
    this.executing = true;
    if (this.waiters.length > 0) {
      const {f, resolve, reject} = this.waiters.shift();
      let value;
      let error;
      try {
        value = await f();
      } catch (e) {
        error = e;
      }
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    }
    this.executing = false;
    if (this.waiters.length > 0) {
      _.defer(() => {
        this._execute();
      });
    }
  }
}

module.exports = Lock;
