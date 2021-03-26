import { SinonStub } from 'sinon';
import sinon = require('sinon');
import should = require('should');
import _ = require('lodash');
import mock = require('mock-require');

import PayClient from '../src/PayClient';
require('should-sinon');

type StubFunction = (...params: any[]) => any;

const SUCCESSFUL_EMPTY_JSON_RESPONSE = {
  statusCode: 200,
  headers: {
    'content-type': ['application/json'],
  },
  body: '{}',
};

const BAD_RESPONSE = {
  statusCode: 500,
  headers: {
    'content-type': ['application/json'],
  },
  body: 'Server error!',
};

const buildExpectedRequest = (method: string, appId: string, path: string, body?: string, qs: object = {}) => ({
  method,
  url: `##URL##${path}`,
  qs: _.extend({
    appId,
    meta: true,
  }, qs),
  body,
  timeout: undefined,
  headers: {
    'Authorization': '##SIGNATURE##',
    'User-Agent': 'ClassyPay Node.JS',
    'Content-Type': body ? 'application/json' : undefined,
  },
  resolveWithFullResponse: true,
});

describe('PayClient', () => {
  let signStub: SinonStub|null;
  let requestStub: SinonStub|null;
  let payClient: PayClient|null;

  beforeEach(() => {
    signStub = sinon.stub();
    signStub.returns('##SIGNATURE##');

    requestStub = sinon.stub();

    mock('../src/utils/hmac256AuthSigner', {
      CreateHMACSigner: () => signStub,
    });
    mock('../src/utils/utils', {requestWithLogs: <StubFunction> requestStub});

    const mockPayClient = mock.reRequire('../src/PayClient');
    payClient = (<PayClient> new mockPayClient.default('##URL##', '##TOKEN##', '##SECRET##'));
  });

  afterEach(() => {
    mock.stopAll();

    signStub = null;
    requestStub = null;
    payClient = null;
  });

  describe('GET', () => {
    it('general GET', async () => {
      if (!requestStub || !signStub || !payClient) throw new Error('Cannot start test, beforeEach() wasn\'t run');
      requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);
      const obj = await payClient.get('appId', '/some/path');
      obj.should.be.eql({});
      signStub.calledOnce.should.be.True();
      signStub.getCall(0).args.should.be.eql(['GET', '/some/path', 'application/json', undefined]);
      requestStub.calledOnce.should.be.True();
      requestStub.getCall(0).args[0].should.be.eql(buildExpectedRequest('GET', 'appId', '/some/path'));
    });

    it('path with dashes', async () => {
      if (!requestStub || !signStub || !payClient) throw new Error('Cannot start test, beforeEach() wasn\'t run');
      requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);
      const obj = await payClient.get('appId', '/some/path/2020-03-14');
      obj.should.be.eql({});
      signStub.calledOnce.should.be.True();
      signStub.getCall(0).args.should.be.eql(['GET', '/some/path/2020-03-14', 'application/json', undefined]);
      requestStub.calledOnce.should.be.True();
      requestStub.getCall(0).args[0].should.be.eql(buildExpectedRequest('GET', 'appId', '/some/path/2020-03-14'));
    });

    it('path with underscore', async () => {
      if (!requestStub || !signStub || !payClient) throw new Error('Cannot start test, beforeEach() wasn\'t run');
      requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);
      const obj = await payClient.get('appId', '/some/path/ch_123');
      obj.should.be.eql({});
      signStub.calledOnce.should.be.True();
      signStub.getCall(0).args.should.be.eql(['GET', '/some/path/ch_123', 'application/json', undefined]);
      requestStub.calledOnce.should.be.True();
      requestStub.getCall(0).args[0].should.be.eql(buildExpectedRequest('GET', 'appId', '/some/path/ch_123'));
    });
  });

  it('Post', async () => {
    if (!requestStub || !signStub || !payClient) throw new Error('Cannot start test, beforeEach() wasn\'t run');
    requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);
    const obj = await payClient.post('appId', '/some/path', {});
    obj.should.be.eql({});
    signStub.calledOnce.should.be.True();
    signStub.getCall(0).args.should.be.eql(['POST', '/some/path', 'application/json', '{}']);
    requestStub.calledOnce.should.be.True();
    requestStub.getCall(0).args[0].should.be.eql(buildExpectedRequest('POST', 'appId', '/some/path', '{}'));
  });

  it('Put', async () => {
    if (!requestStub || !signStub || !payClient) throw new Error('Cannot start test, beforeEach() wasn\'t run');
    requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);
    const obj = await payClient.put('appId', '/some/path', {});
    obj.should.be.eql({});
    signStub.calledOnce.should.be.True();
    signStub.getCall(0).args.should.be.eql(['PUT', '/some/path', 'application/json', '{}']);
    requestStub.calledOnce.should.be.True();
    requestStub.getCall(0).args[0].should.be.eql(buildExpectedRequest('PUT', 'appId', '/some/path', '{}'));
  });

  it('Del(ete)', async () => {
    if (!requestStub || !signStub || !payClient) throw new Error('Cannot start test, beforeEach() wasn\'t run');
    requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);
    const obj = await payClient.del('appId', '/some/path');
    obj.should.be.eql({});
    signStub.calledOnce.should.be.True();
    signStub.getCall(0).args.should.be.eql(['DELETE', '/some/path', 'application/json', undefined]);
    requestStub.calledOnce.should.be.True();
    requestStub.getCall(0).args[0].should.be.eql(buildExpectedRequest('DELETE', 'appId', '/some/path'));
  });

  it('List', async () => {
    if (!requestStub || !signStub || !payClient) throw new Error('Cannot start test, beforeEach() wasn\'t run');
    requestStub.withArgs({
      method: 'GET',
      url: '##URL##/some/path/count',
      qs: {
        appId: 'appId',
        meta: true,
      },
      body: undefined,
      timeout: undefined,
      headers: {
        'Authorization': '##SIGNATURE##',
        'User-Agent': 'ClassyPay Node.JS',
        'Content-Type': undefined,
      },
      resolveWithFullResponse: true,
    }).resolves(_.extend(_.clone(SUCCESSFUL_EMPTY_JSON_RESPONSE), {body: '{"count":40}'}));
    requestStub.resolves(_.extend(
      _.clone(SUCCESSFUL_EMPTY_JSON_RESPONSE),
      {body: JSON.stringify(_.map(_.range(0, 25), () => ({})))},
    ));
    const obj = await payClient.list('appId', '/some/path');
    obj.should.be.eql(_.map(_.range(0, 50), () => ({})));
    signStub.calledThrice.should.be.True();
    signStub.getCall(0).args.should.be.eql(['GET', '/some/path/count', 'application/json', undefined]);
    signStub.getCall(1).args.should.be.eql(['GET', '/some/path', 'application/json', undefined]);
    signStub.getCall(2).args.should.be.eql(['GET', '/some/path', 'application/json', undefined]);
    requestStub.calledThrice.should.be.True();
    requestStub.getCall(0).args[0].should.be.eql(buildExpectedRequest('GET', 'appId', '/some/path/count'));
    requestStub.getCall(1).args[0].should.be.eql(
      buildExpectedRequest('GET', 'appId', '/some/path', undefined, {limit: 25, offset: 0}),
    );
    requestStub.getCall(2).args[0].should.be.eql(
      buildExpectedRequest('GET', 'appId', '/some/path', undefined, {limit: 25, offset: 25}),
    );
  });

  it('Rejects non-string appId', async () => {
    if (!requestStub || !signStub || !payClient) {
      throw new Error('Cannot start test, beforeEach() wasn\'t run');
    }
    let error;
    try {
      // @ts-ignore testing usage in non-ts
      await payClient.get(10, '/some/path');
    } catch (e) {
      error = e;
    }
    should.exist(error);
  });

  it('Rejects invalid resource', async () => {
    if (!requestStub || !signStub || !payClient) {
      throw new Error('Cannot start test, beforeEach() wasn\'t run');
    }
    let error;
    try {
      await payClient.get('appId', '/some/path?appId=15');
    } catch (e) {
      error = e;
    }
    should.exist(error);
  });

  it('Throws server error', async () => {
    if (!requestStub || !signStub || !payClient) {
      throw new Error('Cannot start test, beforeEach() wasn\'t run');
    }
    requestStub.resolves(BAD_RESPONSE);
    let error;
    try {
      await payClient.get('appId', '/some/path');
    } catch (e) {
      error = e;
    }
    should.exist(error);
  });

  describe('ForApp Shortcuts', () => {
    let stubs: { [index in 'list' | 'get' | 'post' | 'put' | 'del' ] : SinonStub } | undefined;

    beforeEach(() => {
      if (!payClient) {
        throw new Error('Cannot start test, no payClient to stub');
      }
      stubs = {
        list: sinon.stub<PayClient>(payClient, 'list').resolves({}),
        get: sinon.stub<PayClient>(payClient, 'get').resolves({}),
        post: sinon.stub<PayClient>(payClient, 'post').resolves({}),
        put: sinon.stub<PayClient>(payClient, 'put').resolves({}),
        del: sinon.stub<PayClient>(payClient, 'del').resolves({}),
      };
    });

    afterEach(() => {
      stubs = undefined;
    });

    it('Get', async () => {
      if (!requestStub || !signStub || !payClient || !stubs) {
        throw new Error('Cannot start test, beforeEach() wasn\'t run');
      }
      const obj = await payClient.forAppId('appId').get('/some/path');
      obj.should.be.eql({});
      stubs.get.calledOnce.should.be.True();
    });

    it('Post', async () => {
      if (!requestStub || !signStub || !payClient || !stubs) {
        throw new Error('Cannot start test, beforeEach() wasn\'t run');
      }
      const obj = await payClient.forAppId('appId').post('/some/path', {});
      obj.should.be.eql({});
      stubs.post.calledOnce.should.be.True();
    });

    it('Put', async () => {
      if (!requestStub || !signStub || !payClient || !stubs) {
        throw new Error('Cannot start test, beforeEach() wasn\'t run');
      }
      const obj = await payClient.forAppId('appId').put('/some/path', {});
      obj.should.be.eql({});
      stubs.put.calledOnce.should.be.True();
    });

    it('Del(ete)', async () => {
      if (!requestStub || !signStub || !payClient || !stubs) {
        throw new Error('Cannot start test, beforeEach() wasn\'t run');
      }
      const obj = await payClient.forAppId('appId').del('/some/path');
      obj.should.be.eql({});
      stubs.del.calledOnce.should.be.True();
    });

    it('List', async () => {
      if (!requestStub || !signStub || !payClient || !stubs) {
        throw new Error('Cannot start test, beforeEach() wasn\'t run');
      }
      const obj = await payClient.forAppId('appId').list('/some/path');
      obj.should.be.eql({});
      stubs.list.calledOnce.should.be.True();
    });

    it('Rejects non-string appId', async () => {
      if (!requestStub || !signStub || !payClient || !stubs) {
        throw new Error('Cannot start test, beforeEach() wasn\'t run');
      }
      let error;
      try {
        // @ts-ignore testing usage in non-ts
        payClient.forAppId(10);
      } catch (e) {
        error = e;
      }
      should.exist(error);
    });

  });
});
