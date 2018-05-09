'use strict';
const _ = require('lodash');
const PayClient = require('../PayClient')

class ClientDataSource {
  async initialize(config) {
    this.clients = {};

    if (await config.get('pay')) {
      this.clients.payClient = new PayClient(
        await config.get('pay.apiUrl'),
        await config.get('PAY_TOKEN'),
        await config.get('PAY_SECRET'), {
          timeout: await config.get('pay.timeout')
        });
    }

    if (await config.get('api')) {
      this.clients.apiClient = require('classy-api-client')({
        clientId: await config.get('APIV2_CLIENT_ID'),
        clientSecret: await config.get('APIV2_CLIENT_SECRET'),
        timeout: await config.get('api.timeout'),
        oauthUrl: await config.get('api.oauthUrl'),
        apiUrl: await config.get('api.apiUrl')
      });
    }
  }

  get(key) {
    return _.get(this.clients, _.camelCase(key), null);
  }
}

module.exports = new ClientDataSource;
