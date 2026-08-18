require('source-map-support').install();

import Config from '../Config';

export class AWSConfig extends Config {
  constructor(appName: string) {
    // Order matters: Config aborts reentrant lookups once iteration reaches a
    // data source that is mid-query, so Replacer must be registered before
    // Logging for LoggingDataSource to resolve 'Replacer' during initialize,
    // and Logging before Clients so the clients can resolve 'Logger'.
    super([
      require('../DataSources/Name')(appName),
      require('../DataSources/Environment'),
      require('../DataSources/Credstash'),
      require('../DataSources/Replacer'),
      require('../DataSources/Logging'),
      require('../DataSources/Clients'),
    ]);
  }
}

export default AWSConfig;
