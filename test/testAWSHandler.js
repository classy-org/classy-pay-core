'use strict';
require('source-map-support').install();
require('regenerator-runtime/runtime');
const awsHandler = require('../lib/awsHandler');

const handler = awsHandler(async (event, context, config) => {
  console.log(await config.PayClient);
  throw Error('Fake error!');
});

handler({}, {}, (error, result) => {
  console.log(`error ${error} result ${result}`);
});
