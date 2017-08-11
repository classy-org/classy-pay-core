'use strict';

const request = require('request');
const OAuth2 = require('oauth').OAuth2;
let clientId;
let clientSecret;
let oauthUrl;
let apiUrl;
let timeout;

function generateApiToken(next) {
  let oauth2 = new OAuth2(clientId, clientSecret, oauthUrl,
    null, 'oauth2/auth', null);
  oauth2.getOAuthAccessToken('', {
    grant_type: 'client_credentials'
  }, next);
};

function apiRequest(method, resource, payload, callback) {
  generateApiToken(function(error, bearer) {
    let options = {
      url: `${apiUrl}${resource}`,
      timeout,
      method,
      headers: {
        'Authorization': `Bearer ${bearer}`,
        'User-Agent': 'ClassyPay Node.JS'
      }
    };
    if (payload) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        callback(null, body ? JSON.parse(body) : {});
      } else {
        log.error(error || `Response not 200:
          ${JSON.stringify(response, null, 2)}`);
        callback(error || `Response was not 200 OK:
          ${JSON.stringify(response, null, 2)}`);
      }
    });
  });
}

module.exports = (config) => {
  if (!config || !config.clientId || !config.clientSecret ||
    !config.oauthUrl || !config.apiUrl || !config.timeout) {
    throw new Error(`You must provide clientId, clientSecret, oauthUrl,
      apiUrl and timeout.`);
  }
  clientId = config.clientId;
  clientSecret = config.clientSecret;
  oauthUrl = config.oauthUrl;
  apiUrl = config.apiUrl;
  timeout = config.timeout;
  return {
    request: apiRequest
  };
};
