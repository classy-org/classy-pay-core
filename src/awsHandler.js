'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();
const Common = require('./index');

let bugsnag;

module.exports = (handler, appName) => {
  return async (event, context) => {
    if (!bugsnag) {
      bugsnag = await require('./utils/bugsnagFactory')(appName);
    }
    try {
      let result = await handler(event, context, Common.async());
      return result;
    } catch (error) {
      bugsnag.notify(error);
      throw error;
    }
  };
};
