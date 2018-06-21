const should = require('should');
const sinon = require('sinon');
require('should-sinon');
const rewire = require('rewire');
const {promisify} = require('util');

const awsHandler = rewire('../../src/aws/handler');

describe('AWS Handler', () => {
  let revert;

  let AWSConfigStub;
  let AWSConfigGetStub;
  let bugsnagFactory;
  let bugsnag;

  beforeEach(() => {
    AWSConfigStub = sinon.stub();
    AWSConfigStub.prototype.get = () => {};
    AWSConfigGetStub = sinon.stub(AWSConfigStub.prototype, 'get');

    bugsnagFactory = sinon.stub();
    bugsnag = {
      notify: sinon.stub()
    };
    bugsnagFactory.resolves(bugsnag);

    revert = awsHandler.__set__({
      AWSConfig: AWSConfigStub,
      bugsnagFactory
    });

    bugsnag.notify.yields(null, {});
  });

  afterEach(() => {
    revert();
    revert = null;
  });

  it('Success case', async () => {
    const handlerStub = sinon.stub();
    handlerStub.resolves('HELLO');

    const result = await promisify(awsHandler(handlerStub, 'APP'))({}, {});
    result.should.be.eql('HELLO');

    bugsnagFactory.should.be.calledOnce();
    AWSConfigStub.should.be.calledOnce();
    AWSConfigGetStub.should.be.calledTwice();

    bugsnag.notify.callCount.should.be.eql(0);

    handlerStub.should.be.calledOnce();
  });

  it('Multiple handler calls should invoke initialization only once', async () => {
    const handlerStub = sinon.stub();
    handlerStub.resolves('HELLO');

    const handler = promisify(awsHandler(handlerStub, 'APP'));
    await handler({}, {});
    await handler({}, {});
    await handler({}, {});

    bugsnagFactory.should.be.calledOnce();
    AWSConfigStub.should.be.calledOnce();
    AWSConfigGetStub.should.be.calledTwice();

    bugsnag.notify.callCount.should.be.eql(0);

    handlerStub.should.be.calledThrice();
  });

  it('Error should propagate correctly', async () => {
    const handlerStub = sinon.stub();
    handlerStub.rejects(new Error('There was a problem'));

    let error;
    try {
      await promisify(awsHandler(handlerStub, 'APP'))({}, {});
    } catch (e) {
      error = e;
    }

    should.exist(error);

    bugsnagFactory.should.be.calledOnce();
    AWSConfigStub.should.be.calledOnce();
    AWSConfigGetStub.should.be.calledTwice();

    bugsnag.notify.callCount.should.be.eql(1);

    handlerStub.should.be.calledOnce();
  });

  it('Wraps non-error object throwables in an Error object', async () => {
    const handlerStub = sinon.stub();
    handlerStub.rejects({});

    let error;
    try {
      await promisify(awsHandler(handlerStub, 'APP'))({}, {});
    } catch (e) {
      error = e;
    }

    should.exist(error);
    (error instanceof Error).should.be.true();
    error.message.should.be.eql('{}');

    bugsnagFactory.should.be.calledOnce();
    AWSConfigStub.should.be.calledOnce();
    AWSConfigGetStub.should.be.calledTwice();

    bugsnag.notify.callCount.should.be.eql(1);

    handlerStub.should.be.calledOnce();
  });
});
