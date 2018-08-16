require('source-map-support').install();

const _ = require('lodash');

import { PayClient } from '../PayClient';
import { APIClient } from '../APIClient';
import { DataSource, DataSourceConfig } from '../DataSource';

export class ClientDataSource extends DataSource {
  private clients?: { payClient?: PayClient, apiClient?: any };

  public async initialize(config: DataSourceConfig) {
    this.clients = {};

    if (await config.get('pay')) {
      this.clients.payClient = new PayClient(
        await config.get('pay.apiUrl'),
        await config.get('PAY_TOKEN'),
        await config.get('PAY_SECRET'), {
          timeout: await config.get('pay.timeout'),
          log: await config.get('pay.log') ? await config.get('Logger') : undefined,
          version: await config.get('pay.version') ? await config.get('pay.version') : undefined,
        });
    }

    if (await config.get('api')) {
      this.clients.apiClient = new APIClient(
        await config.get('APIV2_CLIENT_ID'),
        await config.get('APIV2_CLIENT_SECRET'),
        await config.get('api.oauthUrl'),
        await config.get('api.apiUrl'),
        {
          timeout: await config.get('api.timeout'),
          log: await config.get('api.log') ? await config.get('Logger') : undefined,
        },
      );
    }
  }

  public async get(key: string): Promise<any> {
    return _.get(this.clients, _.camelCase(key), null);
  }

  public name(): string {
    return 'Clients';
  }
}

module.exports = new ClientDataSource();
