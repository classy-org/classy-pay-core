'use strict';
require('source-map-support').install();
const Common = require('../lib/index.js').legacy();
let log;
Common.load(function(error) {
  if (error) {
    console.log(error);
  } else {
    log = Common.Logger.create('test');
    log.info('Testing 1 2 3');
    log.info(Common.LOG_LOGGLY_TOKEN);
    log.info(Common.log.logger);
  }
});
