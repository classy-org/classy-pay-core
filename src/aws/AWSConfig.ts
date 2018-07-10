require('source-map-support').install();

import Config from '../Config';

export class AWSConfig extends Config {
  constructor(appName: string) {
    super([
      require('../DataSources/Name')(appName),
      require('../DataSources/Environment'),
      require('../DataSources/Credstash'),
      require('../DataSources/Clients'),
      require('../DataSources/Logging'),
      require('../DataSources/Replacer'),
    ]);
  }
}

export default AWSConfig;
