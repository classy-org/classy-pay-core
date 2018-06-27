import sinon = require('sinon');
import should = require('should');
require('should-sinon');
import mock = require('mock-require');
import {SinonStub} from "sinon";

type initializeFunction = (appName: string, key: string, releaseStage: string) => Promise<void>;

describe('Bugsnag Factory', () => {
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
  let processStubs: {
    listeners: SinonStub,
    removeListener: SinonStub
    on: SinonStub
  } | undefined;
  let bugsnagStubs: {
    register: SinonStub,
    on: SinonStub,
    notify: SinonStub
  } | undefined;
  let initialize: initializeFunction|undefined;

  before(() => {
    processStubs = {
      listeners: sinon.stub(process, 'listeners'),
      removeListener: sinon.stub(process, 'removeListener'),
      on: sinon.stub(process, 'on')
    };
    processStubs.listeners.returns(['Listener1', 'Listener2']);

    bugsnagStubs = {
      register: sinon.stub(bugsnag, 'register'),
      on: sinon.stub(bugsnag, 'on'),
      notify: sinon.stub(bugsnag, 'notify')
    };

    mock('process', process);
    mock('bugsnag', bugsnag);

    initialize = mock.reRequire('../../src/utils/bugsnagFactory').initialize;
  });

  after(() => {
    mock.stopAll();
  });

  it('Initial Setup', async () => {
    if (!initialize || !processStubs || !bugsnagStubs) throw new Error('Test wasn\'t correctly set up');
    await initialize('appName', 'key', 'releaseStage');
    await initialize('appName', 'key', 'releaseStage');
    processStubs.listeners.should.have.been.calledOnce();
    processStubs.removeListener.should.have.been.calledTwice();
    processStubs.on.should.have.been.calledTwice();
    processStubs.on.getCall(0).args[0].should.be.eql('uncaughtException');
    processStubs.on.getCall(1).args[0].should.be.eql('unhandledRejection');;
  });

  it('Should error when reconfigured', async () => {
    if (!initialize || !processStubs || !bugsnagStubs) throw new Error('Test wasn\'t correctly set up');
    let error;
    try {
      await initialize('anotherAppName', 'key', 'releaseStage');
    } catch (e) {
      error = e;
    }
    should.exist(error);
  });

  it('Handle uncaught exception', async () => {
    if (!initialize || !processStubs || !bugsnagStubs) throw new Error('Test wasn\'t correctly set up');
    bugsnagStubs.notify.resetHistory();
    processStubs.on.getCall(0).args[1]('error');
    bugsnagStubs.notify.should.have.been.calledOnce();
    bugsnagStubs.notify.getCall(0).args[0].should.eql('error');
  });

  it('Handle unhandled rejection', async () => {
    if (!initialize || !processStubs || !bugsnagStubs) throw new Error('Test wasn\'t correctly set up');
    bugsnagStubs.notify.resetHistory();
    processStubs.on.getCall(1).args[1]('error');
    bugsnagStubs.notify.should.have.been.calledOnce();
    bugsnagStubs.notify.getCall(0).args[0].should.eql('error');
  });
});
