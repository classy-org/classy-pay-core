'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

module.exports = {
  submodule: name => require(`./${name}`)
};
