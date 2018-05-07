const sinon = require('sinon');
const should = require('should');
require('should-sinon');
const rewire = require('rewire');
const bugsnagFactory = rewire('../../src/utils/bugsnagFactory');

describe('Bugsnag Factory', () => {
  let revert;
  let bugsnag = {
    register: () => {},
    on: () => {},
    notify: () => {}
  };
  let process = {
    listeners: () => {},
    removeListener: () => {},
    on: () => {},
    env: {
      BB_COMMIT: 'BB_COMMIT'
    }
  };
  let processStubs = {};
  let bugsnagStubs = {};

  before(() => {
    processStubs.listeners = sinon.stub(process, 'listeners');
    processStubs.listeners.returns(['Listener1', 'Listener2']);
    processStubs.removeListener = sinon.stub(process, 'removeListener');
    processStubs.on = sinon.stub(process, 'on');

    bugsnagStubs.region = sinon.stub(bugsnag, 'register');
    bugsnagStubs.on = sinon.stub(bugsnag, 'on');
    bugsnagStubs.notify = sinon.stub(bugsnag, 'notify');

    revert = bugsnagFactory.__set__({
      process,
      bugsnag
    });
  });

  after(() => {
    revert();
  });

  it('Initial Setup', async () => {
    let value = await bugsnagFactory('appName', 'key', 'releaseStage');
    await bugsnagFactory('appName', 'key', 'releaseStage');
    processStubs.listeners.should.have.been.calledOnce();
    processStubs.removeListener.should.have.been.calledTwice();
    processStubs.on.should.have.been.calledTwice();
    processStubs.on.getCall(0).args[0].should.be.eql('uncaughtException');
    processStubs.on.getCall(1).args[0].should.be.eql('unhandledRejection');
    value.should.be.eql(bugsnag);
  });

  it('Should error when reconfigured', async () => {
    let error;
    try {
      await bugsnagFactory('anotherAppName', 'key', 'releaseStage');
    } catch (e) {
      error = e;
    }
    should.exist(error);
  });

  it('Handle uncaught exception', async () => {
    bugsnagStubs.notify.resetHistory();
    processStubs.on.getCall(0).args[1]('error');
    bugsnagStubs.notify.should.have.been.calledOnce();
    bugsnagStubs.notify.getCall(0).args[0].should.eql('error');
  });

  it('Handle unhandled rejection', async () => {
    bugsnagStubs.notify.resetHistory();
    processStubs.on.getCall(1).args[1]('error');
    bugsnagStubs.notify.should.have.been.calledOnce();
    bugsnagStubs.notify.getCall(0).args[0].should.eql('error');
  });
});
