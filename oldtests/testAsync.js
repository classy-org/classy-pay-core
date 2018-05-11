'use strict';
require('source-map-support').install();
require('regenerator-runtime/runtime');
const Common = require('../lib/index.js').async();

const f = async () => {
  try {
    let log = (await Common.Logger).create('test');
    log.info('Testing 1 2 3');
    log.info(await Common.LOG_LOGGLY_TOKEN);
    log.info(await Common.log.logger);
  } catch (e) {
    console.error(e);
  }
};

f();
