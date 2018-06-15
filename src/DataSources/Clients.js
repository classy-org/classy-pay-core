'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const _ = require('lodash');
const PayClient = require('../PayClient');
const Promise = require('bluebird');

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
      if (await config.get('api.clientType') === 'classy-node') {
        const Classy = require('classy-node');
        this.clients.apiClient = new Classy({
          clientId: await config.get('APIV2_CLIENT_ID'),
          clientSecret: await config.get('APIV2_CLIENT_SECRET')
        });
      } else {
        this.clients.apiClient = Promise.promisifyAll(require('classy-api-client')({
          clientId: await config.get('APIV2_CLIENT_ID'),
          clientSecret: await config.get('APIV2_CLIENT_SECRET'),
          timeout: await config.get('api.timeout'),
          oauthUrl: await config.get('api.oauthUrl'),
          apiUrl: await config.get('api.apiUrl')
        }));
      }
    }
  }

  async get(key) {
    return _.get(this.clients, _.camelCase(key), null);
  }

  name() {
    return 'Clients';
  }
}

module.exports = new ClientDataSource;
