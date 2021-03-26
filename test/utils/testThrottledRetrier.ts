import sinon = require('sinon');
import should = require('should');
require('should-sinon');

import { throttledRetrier } from '../../src/utils/throttledRetrier';

describe('Throttled retrier', () => {
  it('Runs function only once in base success case', async () => {
    const stub = sinon.stub().resolves('BLAH');
    const f = throttledRetrier(stub, { disableErrorLogging: true });
    const v = await f();
    stub.calledOnce.should.be.True();
    v.should.be.eql('BLAH');
  });

  it('Runs function 5 times in base failure case', async () => {
    const stub = sinon.stub().rejects(new Error());
    const f = throttledRetrier(stub, {
      disableErrorLogging: true,
      sleepAmountFunction: attemptNumber => 10 * attemptNumber,
    });
    let error = null;
    let v = null;
    try {
      v = await f();
    } catch (e) {
      error = e;
    }
    stub.callCount.should.be.eql(5);
    should.not.exist(v);
    should.exist(error);
  });

  it('Function honors retry count', async () => {
    const stub = sinon.stub().rejects(new Error());
    const f = throttledRetrier(stub, {
      disableErrorLogging: true,
      maxNumberOfTries: 2,
      sleepAmountFunction: attemptNumber => 10 * attemptNumber,
    });
    let error = null;
    let v = null;
    try {
      v = await f();
    } catch (e) {
      error = e;
    }
    stub.callCount.should.be.eql(2);
    should.not.exist(v);
    should.exist(error);
  });

  it('Function rejects bad retry counts', async () => {
    const stub = sinon.stub().resolves('BLAH');
    const f = throttledRetrier(stub, {
      disableErrorLogging: true,
      maxNumberOfTries: -5,
    });
    let error = null;
    let v = null;
    try {
      v = await f();
    } catch (e) {
      error = e;
    }
    stub.callCount.should.be.eql(0);
    should.not.exist(v);
    should.exist(error);
  });

  it('Runs function until success', async () => {
    const stub = sinon.stub();
    stub.onCall(0).rejects(new Error());
    stub.onCall(1).resolves('BLAH2');
    const f = throttledRetrier(stub, {
      disableErrorLogging: true,
      sleepAmountFunction: attemptNumber => 10 * attemptNumber,
    });
    const v = await f();
    stub.calledTwice.should.be.True();
    v.should.be.eql('BLAH2');
  });

  it('Stops immediately on non-retryable error', async () => {
    const stub = sinon.stub();
    stub.onCall(0).rejects(new Error());
    stub.onCall(1).resolves('BLAH2');
    const f = throttledRetrier(stub, {
      disableErrorLogging: true,
      sleepAmountFunction: attemptNumber => 10 * attemptNumber,
      isErrorRetryableFunc: () => false,
    });
    let v;
    let error;
    try {
      v = await f();
    } catch (e) {
      error = e;
    }
    stub.calledOnce.should.be.True();
    should.exist(error);
    should.not.exist(v);
  });
});
