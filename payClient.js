'use strict';
let apiUrl;
let token;
let secret;
let timeout;
let HmacAuthorize;

function request(appId, method, resource, payload, callback) {
  let options = {
    url: `${apiUrl}${resource}?appId=${appId}&meta=true`,
    timeout: timeout,
    method,
    headers: {
      'Authorization': HmacAuthorize.sign(method, resource, 'application/json',
        payload ? JSON.stringify(payload) : null),
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
      log.error(error || 'Response not 200: ' +
        JSON.stringify(response, null, 2));
      callback(error || 'Response was not 200 OK: ' +
        JSON.stringify(response, null, 2));
    }
  });
}

module.exports = (config) => {
  if (!config || !config.apiUrl || !config.timeout ||
    !config.token || !config.secret) {
    throw new Exception('You must provide apiUrl, timeout, token, and secret.');
  }
  apiUrl = config.apiUrl;
  token = config.token;
  secret = config.secret;
  timeout = config.timeout;
  HmacAuthorize = require('authorization-hmac256')({
    service: 'CWS',
    token,
    secret
  });
  return {
    request: request
  };
};
