import should = require('should');
import sinon = require('sinon');
import {SinonStub} from 'sinon';
require('should-sinon');
import { promisify } from 'util';
import mock = require('mock-require');
import { ClassyAWSHandler } from '../../src/aws/handler';
import * as AWSLambda from 'aws-lambda';

type LambdaHandler = (event: any, context: AWSLambda.Context, callback: AWSLambda.Callback<any>) => void;
type ClassyLambdaHandlerGenerator = (handler: ClassyAWSHandler, appName: string) => LambdaHandler;

describe('AWS Handler', () => {

  let AWSConfigStub: SinonStub|undefined;
  let AWSConfigGetStub: SinonStub|undefined;
  let bugsnagFactory: {
    initialize: SinonStub;
  }|undefined;
  let bugsnag: {
    notify: SinonStub;
  }|undefined;
  let awsHandler: ClassyLambdaHandlerGenerator|undefined;

  beforeEach(() => {
    AWSConfigStub = sinon.stub();
    AWSConfigStub.prototype.get = () => {};
    AWSConfigGetStub = sinon.stub(AWSConfigStub.prototype, 'get');

    bugsnagFactory = { initialize: sinon.stub() };
    bugsnag = { notify: sinon.stub() };
    bugsnagFactory.initialize.resolves(bugsnag);

    bugsnag.notify.yields(null, {});

    mock('../../src/utils/bugsnagFactory', bugsnagFactory);
    mock('../../src/aws/AWSConfig', { AWSConfig: AWSConfigStub });
    mock('bugsnag', bugsnag);

    awsHandler = <ClassyLambdaHandlerGenerator> mock.reRequire('../../src/aws/handler').handlerGenerator;
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('Success case', async () => {
    if (!awsHandler || !bugsnagFactory || !AWSConfigStub || !AWSConfigGetStub || !bugsnag) {
      throw new Error('Test wasn\'t correctly initialized');
    }
    const handlerStub = sinon.stub();
    handlerStub.resolves('HELLO');

    const result = await (<any> promisify(awsHandler(handlerStub, 'APP')))({}, {});
    result.should.be.eql('HELLO');

    bugsnagFactory.initialize.should.have.been.calledOnce();
    AWSConfigStub.should.be.calledOnce();
    AWSConfigGetStub.should.be.calledTwice();

    bugsnag.notify.callCount.should.be.eql(0);

    handlerStub.should.be.calledOnce();
  });

  it('Multiple handler calls should invoke initialization only once', async () => {
    if (!awsHandler || !bugsnagFactory || !AWSConfigStub || !AWSConfigGetStub || !bugsnag) {
      throw new Error('Test wasn\'t correctly initialized');
    }
    const handlerStub = sinon.stub();
    handlerStub.resolves('HELLO');

    const handler = <any> promisify(awsHandler(handlerStub, 'APP'));
    await handler({}, {});
    await handler({}, {});
    await handler({}, {});

    bugsnagFactory.initialize.should.be.calledOnce();
    AWSConfigStub.should.be.calledOnce();
    AWSConfigGetStub.should.be.calledTwice();

    bugsnag.notify.callCount.should.be.eql(0);

    handlerStub.should.be.calledThrice();
  });

  it('Error should propagate correctly', async () => {
    if (!awsHandler || !bugsnagFactory || !AWSConfigStub || !AWSConfigGetStub || !bugsnag) {
      throw new Error('Test wasn\'t correctly initialized');
    }
    const handlerStub = sinon.stub();
    handlerStub.rejects(new Error('There was a problem'));

    let error;
    try {
      await (<any> promisify(awsHandler(handlerStub, 'APP')))({}, {});
    } catch (e) {
      error = e;
    }

    should.exist(error);

    bugsnagFactory.initialize.should.be.calledOnce();
    AWSConfigStub.should.be.calledOnce();
    AWSConfigGetStub.should.be.calledTwice();

    bugsnag.notify.callCount.should.be.eql(1);

    handlerStub.should.be.calledOnce();
  });

  it('Wraps non-error object throwables in an Error object', async () => {
    if (!awsHandler || !bugsnagFactory || !AWSConfigStub || !AWSConfigGetStub || !bugsnag) {
      throw new Error('Test wasn\'t correctly initialized');
    }
    const handlerStub = sinon.stub();
    handlerStub.rejects({});

    let error;
    try {
      await (<any> promisify(awsHandler(handlerStub, 'APP')))({}, {});
    } catch (e) {
      error = e;
    }

    should.exist(error);
    (error instanceof Error).should.be.true();
    error.message.should.be.eql('{}');

    bugsnagFactory.initialize.should.be.calledOnce();
    AWSConfigStub.should.be.calledOnce();
    AWSConfigGetStub.should.be.calledTwice();

    bugsnag.notify.callCount.should.be.eql(1);

    handlerStub.should.be.calledOnce();
  });
});
