'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

class ReplacerDataSource {
  async initialize(config) {
    if (await config.get('security')) {
      const keys = await config.get('security.obfuscate');
      const replacement = await config.get('security.replacement');

      if (!keys || !replacement) {
        throw Error('You need to fill in both security.obfuscate and security.replacement to use replacer');
      }

      this.replacer = (key, value) => {
        if (keys.includes(key)) {
          return replacement;
        }
        return value;
      };
    }
  }

  get(key) {
    return key === 'Replacer' ? this.replacer : null;
  }

  name() {
    return 'Replacer';
  }
}

module.exports = new ReplacerDataSource;
