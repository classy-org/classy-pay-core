const _ = require('lodash');

class Once {
  constructor(f) {
    this.done = false;
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

  do() {
    return this.oncePromise;
  }
}

module.exports = Once;
