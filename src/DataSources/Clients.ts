require('source-map-support').install();

const _ = require('lodash');
import PayClient from '../PayClient';
const Bluebird = require('bluebird');

import {DataSource, DataSourceConfig} from '../DataSource';

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
        });
    }

    if (await config.get('api')) {
      this.clients.apiClient = Bluebird.promisifyAll(require('classy-api-client')({
        clientId: await config.get('APIV2_CLIENT_ID'),
        clientSecret: await config.get('APIV2_CLIENT_SECRET'),
        timeout: await config.get('api.timeout'),
        oauthUrl: await config.get('api.oauthUrl'),
        apiUrl: await config.get('api.apiUrl'),
      }));
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
