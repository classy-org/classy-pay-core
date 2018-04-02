class Once {
  constructor(f) {
    this.oncePromise = f().then(() => {
      this.done = true;
    }).catch(error => {
      console.error(`Fatal exception caught: ${error}`);
      throw error;
    });
    this.done = false;
  }

  do() {
    return this.oncePromise;
  }
}

module.exports = Once;
