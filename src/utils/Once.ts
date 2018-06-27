'use strict';
require('source-map-support').install();

import * as _ from 'lodash';

export class Once {
  done: boolean = false;
  oncePromise: Promise<any>;

  constructor(f: () => Promise<any>) {
    this.oncePromise = f().then(() => {
      this.done = true;
    }).catch(error => {
      console.error(`Fatal exception caught: ${error}`);

      // Throw error outside of promise
      _.defer(() => {
        throw error;
      });
    });
  }

  do(): Promise<any> {
    return this.oncePromise;
  }
}

export default Once;