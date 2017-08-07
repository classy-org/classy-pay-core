'use strict';
const Common = require('../index.js');
let log;
Common.load(function(error) {
  if (error) {
    console.log(error);
  } else {
    log = Common.get('Logger').create('test');
    log.info('Testing 1 2 3');
    log.info(Common.get('LOG_LOGGLY_TOKEN'));
    log.info(Common.get('log.logger'));
  }
});
