'use strict';

module.exports = {
  submodule: name => require(`./${name}`)
};
