'use strict';
require('regenerator-runtime/runtime');
const _ = require('lodash');

class ClientDataSource {
  async initialize(config) {
    this.clients = {};

    if (await config.get('pay')) {
      this.clients.PayClient = require('classy-pay-client')({
        apiUrl: await config.get('pay.apiUrl'),
        timeout: await config.get('pay.timeout'),
        token: await config.get('PAY_TOKEN'),
        secret: await config.get('PAY_SECRET')
      });
    }

    if (await config.get('api')) {
      this.clients.ApiClient = require('classy-api-client')({
        clientId: await config.get('APIV2_CLIENT_ID'),
        clientSecret: await config.get('APIV2_CLIENT_SECRET'),
        timeout: await config.get('api.timeout'),
        oauthUrl: await config.get('api.oauthUrl'),
        apiUrl: await config.get('api.apiUrl')
      });
    }
  }

  get(key) {
    return _.get(this.clients, key, null);
  }
}

module.exports = new ClientDataSource;
