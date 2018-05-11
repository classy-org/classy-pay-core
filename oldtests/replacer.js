'use strict';
require('source-map-support').install();
const Common = require('../lib/index.js');
let log;
let replacer;
Common.load(function(error) {
  if (error) {
    console.log(error);
  } else {
    log = Common.get('Logger').create('test');
    replacer = Common.get('Replacer').replacer;
    log.info('Testing 1 2 3');
    log.info(Common.get('LOG_LOGGLY_TOKEN'));
    log.info(Common.get('log.logger'));
    log.info(JSON.stringify({
      cvv: '123',
      parent: {
        child: {
          cvv: 'abc'
        }
      }
    }, replacer, 2));
  }
});
