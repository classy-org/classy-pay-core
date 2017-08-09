'use strict';
let keys;
let replacement;

module.exports = (config) => {
  if (!config || !config.keys || !config.replacement) {
    throw new Error(`You must provide the array of keys to replace
      and the replacement value.`);
  }
  keys = config.keys;
  replacement = config.replacement;
  return {
    replacer: (key, value) => {
      if (keys.includes(key)) {
        return replacement;
      }
      return value;
    }
  };
};
