'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

class NameDataSource {
  constructor(name) {
    if (!name) {
      throw new Error('Cannot create NameDataSource with no name');
    }
    this.name = name;
  }

  async initialize(config) {
  }

  get(key) {
    return key === 'name' ? this.name : undefined;
  }

  name() {
    return 'Name';
  }
}

module.exports = name => new NameDataSource(name);
