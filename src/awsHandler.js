'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();
const Common = require('./index');
const _ = require('lodash');

let bugsnag;

module.exports = (handler) => {
  return async (event, context, callback) => {
    if (!bugsnag) {
      bugsnag = await require('./utils/bugsnagFactory')();
    }
    try {
      let result = await handler(event, context, Common.async());
      _.defer(callback, null, result);
    } catch (error) {
      bugsnag.notify(error);
      _.defer(callback, error);
    }
  };
};
