const sinon = require('sinon');
const should = require('should');
require('should-sinon');
const callbackWrapper = require('../../src/utils/callbackWrapper');

describe('Callback Wrapper', () => {
  it('Empty Callback', done => {
    const f = sinon.stub();
    callbackWrapper((error, value) => {
      let internalError;
      try {
        should.not.exist(error);
        should.not.exist(value);
      } catch (e) {
        internalError = e;
      } finally {
        done(internalError);
      }
    }, f);
  });

  it('Valid Callback', done => {
    const f = sinon.stub().resolves('value');
    callbackWrapper((error, value) => {
      let internalError;
      try {
        should.not.exist(error);
        should.exist(value);
        value.should.eql('value');
      } catch (e) {
        internalError = e;
      } finally {
        done(internalError);
      }
    }, f);
  });

  it('Errored Callback', done => {
    const f = sinon.stub().throws('Exception');
    callbackWrapper((error, value) => {
      let internalError;
      try {
        should.exist(error);
        should.not.exist(value);
      } catch (e) {
        internalError = e;
      } finally {
        done(internalError);
      }
    }, f);
  });
});
