'use strict';
require('regenerator-runtime/runtime');
const _ = require('lodash');

class ClientDataSource {
  async initialize(config) {
    this.clients = {};

    if (await config.get('pay')) {
      this.clients.PayClient = require('classy-pay-client')({
        apiUrl: config.get('pay.apiUrl'),
        timeout: config.get('pay.timeout'),
        token: config.get('PAY_TOKEN'),
        secret: config.get('PAY_SECRET')
      });
    }

    if (await config.get('api')) {
      this.clients.ApiClient = require('classy-api-client')({
        clientId: config.get('APIV2_CLIENT_ID'),
        clientSecret: config.get('APIV2_CLIENT_SECRET'),
        timeout: config.get('api.timeout'),
        oauthUrl: config.get('api.oauthUrl'),
        apiUrl: config.get('api.apiUrl')
      });
    }
  }

  get(key) {
    return _.get(this.clients, key, null);
  }
}

module.exports = new ClientDataSource;
