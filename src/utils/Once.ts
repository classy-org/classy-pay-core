require('source-map-support').install();

import * as _ from 'lodash';

export class Once {
  private done: boolean = false;
  private oncePromise: Promise<any>;

  constructor(f: () => Promise<any>) {
    this.oncePromise = f().then(() => {
      this.done = true;
    }).catch(error => {
      // We might as well log here so we know what happened, since this will pop to the top of the stack anyway
      // tslint:disable:no-console
      console.error(`Fatal exception caught: ${error}`);

      // Throw error outside of promise
      _.defer(() => {
        throw error;
      });
    });
  }

  public do(): Promise<any> {
    return this.oncePromise;
  }

  public getDone() {
    return this.done;
  }
}

export default Once;
