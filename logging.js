'use strict';

const bunyan = require('bunyan');
const Bunyan2Loggly = require('bunyan-loggly');
let config;

module.exports = function(conf) {
  config = conf;
  if (!config.level || !config.token || !config.subdomain || !config.tags) {
    throw new Error('You must provide level, token, subdomain, and tags.');
  }
  return {
    create: (name) => {
      return bunyan.createLogger({
        name: name,
        level: config.level,
        streams: [{
          type: 'raw',
          stream: new Bunyan2Loggly({
            token: config.token,
            subdomain: config.subdomain,
            tags: config.tags
          })
        }, {
          stream: process.stdout
        }]
      });
    }
  };
};
