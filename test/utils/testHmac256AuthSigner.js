const sinon = require('sinon');
const should = require('should');
require('should-sinon');
const rewire = require('rewire');
const hmac256AuthSigner = rewire('../../src/utils/hmac256AuthSigner');

describe('HMAC256AuthSigner', () => {
  let revert;
  let crypto;
  let cryptoStubs;
  beforeEach(() => {
    crypto = {
      createHash: () => {},
      createHmac: () => {}
    };
    let cryptoFaker = value => ({
      update: () => ({
        digest: () => value
      })
    });
    cryptoStubs = {
      createHash: sinon.stub(crypto, 'createHash').returns(cryptoFaker('##MD5HASH##')),
      createHmac: sinon.stub(crypto, 'createHmac').returns(cryptoFaker('##SHA256HMAC##'))
    }
    revert = hmac256AuthSigner.__set__({'crypto': crypto});
  });
  afterEach(() => {
    revert();

    crypto = null;
    cryptoStubs = null;
  });

  it('Successful Signature', () => {
    let sign = hmac256AuthSigner('service', 'token', 'secret');
    let signed = sign('method', 'path', 'contentType', 'body');
    signed.should.match(/^service ts=[0-9]+ token=token signature=##SHA256HMAC##$/);
    cryptoStubs.createHash.should.have.been.calledOnce();
    cryptoStubs.createHmac.should.have.been.calledOnce();
  });

  describe('Bad Args', () => {
    const genBadArgTest = (name, service, token, secret) => {
      it(name, () => {
        let error;
        try {
          hmac256AuthSigner(service, token, secret);
        } catch (e) {
          error = e;
        }
        should.exist(error);
      });
    };
    genBadArgTest('No service', undefined, 'token', 'secret');
    genBadArgTest('No token', 'service', undefined, 'secret');
    genBadArgTest('No secret', 'service', 'token', undefined);
  });

});
