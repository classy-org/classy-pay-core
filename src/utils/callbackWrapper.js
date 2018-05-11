'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

module.exports = async (next, f) => {
  let error;
  let value;
  try {
    value = await f();
  } catch (e) {
    error = e;
  } finally {
    next(error, value);
  }
};
