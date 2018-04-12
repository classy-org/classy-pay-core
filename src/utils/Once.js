class Once {
  constructor(f) {
    this.done = false;
    this.oncePromise = f().then(() => {
      this.done = true;
    }).catch(error => {
      console.error(`Fatal exception caught: ${error}`);
      throw error;
    });
  }

  do() {
    return this.oncePromise;
  }
}

module.exports = Once;
