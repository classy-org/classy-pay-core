'use strict';
require('source-map-support').install();

import * as _ from 'lodash';

type CriticalPath = () => Promise<any>;

interface LockWaiter {
  f: CriticalPath,
  resolve: (value: any) => void,
  reject: (error: any) => void
};

export class Lock {
  executing: boolean = false;
  waiters: Array<LockWaiter> = [];

  lockForPath(f: CriticalPath) {
    const promise = new Promise((resolve, reject) => {
      this.waiters.push({f, resolve, reject});
      this._execute();
    });
    return promise;
  }

  async _execute() {
    if (this.executing) {
      return;
    }
    this.executing = true;
    let lockWaiter: LockWaiter|undefined;
    if (this.waiters.length > 0 && (lockWaiter = this.waiters.shift())) {
      const {f, resolve, reject} = lockWaiter;
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

export default Lock;