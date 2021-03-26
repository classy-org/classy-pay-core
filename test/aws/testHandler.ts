import should = require('should');
import sinon = require('sinon');
import {SinonStub} from 'sinon';
import { promisify } from 'util';
import mock = require('mock-require');
import * as AWSLambda from 'aws-lambda';

import { ClassyAWSHandler } from '../../src/aws/handler';
require('should-sinon');

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

    AWSConfigGetStub.withArgs('bugsnagEnabled').resolves(true);
    AWSConfigGetStub.resolves('');

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

    bugsnagFactory.initialize.calledOnce.should.be.True();
    AWSConfigStub.calledOnce.should.be.True();
    AWSConfigGetStub.getCalls().length.should.be.eql(3);

    AWSConfigGetStub.getCall(0).args.should.be.eql(['bugsnagEnabled']);
    AWSConfigGetStub.getCall(1).args.should.be.eql(['BUGSNAG_LAMBDAS_KEY']);
    AWSConfigGetStub.getCall(2).args.should.be.eql(['stage']);

    bugsnag.notify.callCount.should.be.eql(0);

    handlerStub.calledOnce.should.be.True();
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

    bugsnagFactory.initialize.calledOnce.should.be.True();
    AWSConfigStub.calledOnce.should.be.True();
    AWSConfigGetStub.getCalls().length.should.be.eql(3);

    AWSConfigGetStub.getCall(0).args.should.be.eql(['bugsnagEnabled']);
    AWSConfigGetStub.getCall(1).args.should.be.eql(['BUGSNAG_LAMBDAS_KEY']);
    AWSConfigGetStub.getCall(2).args.should.be.eql(['stage']);

    bugsnag.notify.callCount.should.be.eql(0);

    handlerStub.calledThrice.should.be.True();
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

    bugsnagFactory.initialize.calledOnce.should.be.True();
    AWSConfigStub.calledOnce.should.be.True();
    AWSConfigGetStub.getCalls().length.should.be.eql(4);

    AWSConfigGetStub.getCall(0).args.should.be.eql(['bugsnagEnabled']);
    AWSConfigGetStub.getCall(1).args.should.be.eql(['BUGSNAG_LAMBDAS_KEY']);
    AWSConfigGetStub.getCall(2).args.should.be.eql(['stage']);
    AWSConfigGetStub.getCall(3).args.should.be.eql(['bugsnagEnabled']);

    bugsnag.notify.callCount.should.be.eql(1);

    handlerStub.calledOnce.should.be.True();
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

    bugsnagFactory.initialize.calledOnce.should.be.True();
    AWSConfigStub.calledOnce.should.be.True();
    AWSConfigGetStub.getCalls().length.should.be.eql(4);

    AWSConfigGetStub.getCall(0).args.should.be.eql(['bugsnagEnabled']);
    AWSConfigGetStub.getCall(1).args.should.be.eql(['BUGSNAG_LAMBDAS_KEY']);
    AWSConfigGetStub.getCall(2).args.should.be.eql(['stage']);
    AWSConfigGetStub.getCall(3).args.should.be.eql(['bugsnagEnabled']);

    bugsnag.notify.callCount.should.be.eql(1);

    handlerStub.calledOnce.should.be.True();
  });
});
