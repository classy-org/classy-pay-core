'use strict';
require('source-map-support').install();

export const submodule = (name: string): any => require(`./${name}`).default ? require(`./${name}`).default : require(`./${name}`);
