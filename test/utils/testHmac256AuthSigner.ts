import sinon = require('sinon');
import should = require('should');
require('should-sinon');
import mock = require('mock-require');
import {HMACSignerFactory, CreateHMACSigner} from '../../src/utils/hmac256AuthSigner';

describe('HMAC256AuthSigner', () => {
  let crypto: any;
  let cryptoStubs: any;
  let hmac256AuthSigner: HMACSignerFactory|undefined;

  beforeEach(() => {
    crypto = {
      createHash: () => {},
      createHmac: () => {}
    };
    let cryptoFaker = (value: string) => ({
      update: () => ({
        digest: () => value
      })
    });
    cryptoStubs = {
      createHash: sinon.stub(crypto, 'createHash').returns(cryptoFaker('##MD5HASH##')),
      createHmac: sinon.stub(crypto, 'createHmac').returns(cryptoFaker('##SHA256HMAC##'))
    }

    mock('crypto', crypto);
    hmac256AuthSigner = <HMACSignerFactory> mock.reRequire('../../src/utils/hmac256AuthSigner').CreateHMACSigner;
  });
  afterEach(() => {
    mock.stopAll();

    crypto = undefined;
    cryptoStubs = undefined;
    hmac256AuthSigner = undefined;
  });

  it('Successful Signature', () => {
    if (!hmac256AuthSigner) throw new Error('Test not set up correctly');
    let sign = hmac256AuthSigner('service', 'token', 'secret');
    let signed = sign('method', 'path', 'contentType', 'body');
    signed.should.match(/^service ts=[0-9]+ token=token signature=##SHA256HMAC##$/);
    cryptoStubs.createHash.should.have.been.calledOnce();
    cryptoStubs.createHmac.should.have.been.calledOnce();
  });

  describe('Bad Args', () => {
    const genBadArgTest = (name: string, service?: string, token?: string, secret?:string) => {
      it(name, () => {
        let error;
        try {
          if (!hmac256AuthSigner) throw new Error('Test not set up correctly');
          // @ts-ignore testing non-ts cases
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
