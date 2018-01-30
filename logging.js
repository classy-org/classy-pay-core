const bunyan = require('bunyan');

module.exports = function(config) {
  return {
    create: (name) => {
      return bunyan.createLogger({
        name: name,
        level: config.level || 'info',
        streams: [{
          stream: process.stdout
        }]
      });
    }
  };
};
