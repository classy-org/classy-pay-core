'use strict';
require('regenerator-runtime/runtime');
require('source-map-support').install();

const crypto = require('crypto');

module.exports = (service, token, secret) => {
  if (!service) throw Error('Hmac256AuthSigner config requires a service');
  if (!token) throw Error('Hmac256AuthSigner config requires a token');
  if (!secret) throw Error('Hmac256AuthSigner config requires a secret');

  return (method, path, contentType, body) => {
    let ts = Math.floor(new Date().getTime() / 1000);
    let message =
      `${method}\n${path}\n${(body ? contentType : '')}\n${ts}\n${(body ?
        crypto.createHash('md5').update(body).digest('hex') : '')}`;
    let signature =
      crypto.createHmac('sha256', secret).update(message).digest('hex');
    return `${service} ts=${ts} token=${token} signature=${signature}`;
  };
}
