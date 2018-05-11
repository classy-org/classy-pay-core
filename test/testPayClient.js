const sinon = require('sinon');
const should = require('should');
require('should-sinon');
const _ = require('lodash');
const rewire = require('rewire');
const PayClient = rewire('../src/PayClient');

const SUCCESSFUL_EMPTY_JSON_RESPONSE = {
  statusCode: 200,
  headers: {
    'content-type': ['application/json']
  },
  body: '{}'
};

const BAD_RESPONSE = {
  statusCode: 500,
  headers: {
    'content-type': ['application/json']
  },
  body: 'Server error!'
};

const buildExpectedRequest = (method, appId, path, body = null, qs = {}) => ({
  method: method,
  url: `##URL##${path}`,
  qs: _.extend({
    appId,
    meta: true
  }, qs),
  body,
  timeout: undefined,
  headers: {
    'Authorization': '##SIGNATURE##',
    'User-Agent': 'ClassyPay Node.JS',
    'Content-Type': body ? 'application/json' : undefined
  },
  resolveWithFullResponse: true
});

describe('PayClient', () => {
  let signStub;
  let requestStub;
  let revert;
  let payClient;

  beforeEach(() => {
    signStub = sinon.stub();
    signStub.returns('##SIGNATURE##');

    requestStub = sinon.stub();

    revert = PayClient.__set__({
      'hmac256AuthSigner': () => signStub,
      'req': requestStub,
    });

    payClient = new PayClient('##URL##', '##TOKEN##', '##SECRET##');
  });

  afterEach(() => {
    revert();

    signStub = null;
    requestStub = null;
    payClient = null;
    revert = null;
  });

  it('Get', async () => {
    requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);
    const obj = await payClient.get('appId', '/some/path');
    obj.should.be.eql({});
    signStub.should.have.been.calledOnce();
    signStub.getCall(0).args.should.be.eql(['GET', '/some/path', 'application/json', null]);
    requestStub.should.have.been.calledOnce();
    requestStub.getCall(0).args[0].should.be.eql(buildExpectedRequest('GET', 'appId', '/some/path'));
  });

  it('Post', async () => {
    requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);
    const obj = await payClient.post('appId', '/some/path', {});
    obj.should.be.eql({});
    signStub.should.have.been.calledOnce();
    signStub.getCall(0).args.should.be.eql(['POST', '/some/path', 'application/json', '{}']);
    requestStub.should.have.been.calledOnce();
    requestStub.getCall(0).args[0].should.be.eql(buildExpectedRequest('POST', 'appId', '/some/path', '{}'));
  });

  it('Put', async () => {
    requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);
    const obj = await payClient.put('appId', '/some/path', {});
    obj.should.be.eql({});
    signStub.should.have.been.calledOnce();
    signStub.getCall(0).args.should.be.eql(['PUT', '/some/path', 'application/json', '{}']);
    requestStub.should.have.been.calledOnce();
    requestStub.getCall(0).args[0].should.be.eql(buildExpectedRequest('PUT', 'appId', '/some/path', '{}'));
  });

  it('Del(ete)', async () => {
    requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);
    const obj = await payClient.del('appId', '/some/path');
    obj.should.be.eql({});
    signStub.should.have.been.calledOnce();
    signStub.getCall(0).args.should.be.eql(['DELETE', '/some/path', 'application/json', null]);
    requestStub.should.have.been.calledOnce();
    requestStub.getCall(0).args[0].should.be.eql(buildExpectedRequest('DELETE', 'appId', '/some/path'));
  });

  it('List', async () => {
    requestStub.withArgs({
      method: 'GET',
      url: '##URL##/some/path/count',
      qs: {
        appId: 'appId',
        meta: true
      },
      body: null,
      timeout: undefined,
      headers: {
        'Authorization': '##SIGNATURE##',
        'User-Agent': 'ClassyPay Node.JS',
        'Content-Type': undefined
      },
      resolveWithFullResponse: true
    }).resolves(_.extend(_.clone(SUCCESSFUL_EMPTY_JSON_RESPONSE), {body: '{"count":40}'}));
    requestStub.resolves(_.extend(_.clone(SUCCESSFUL_EMPTY_JSON_RESPONSE), {body: JSON.stringify(_.map(_.range(0, 25), () => ({})))}));
    const obj = await payClient.list('appId', '/some/path');
    obj.should.be.eql(_.map(_.range(0, 50), () => ({})));
    signStub.should.have.been.calledThrice();
    signStub.getCall(0).args.should.be.eql(['GET', '/some/path/count', 'application/json', null]);
    signStub.getCall(1).args.should.be.eql(['GET', '/some/path', 'application/json', null]);
    signStub.getCall(2).args.should.be.eql(['GET', '/some/path', 'application/json', null]);
    requestStub.should.have.been.calledThrice();
    requestStub.getCall(0).args[0].should.be.eql(buildExpectedRequest('GET', 'appId', '/some/path/count'));
    requestStub.getCall(1).args[0].should.be.eql(buildExpectedRequest('GET', 'appId', '/some/path', null, {limit: 25, offset: 0}));
    requestStub.getCall(2).args[0].should.be.eql(buildExpectedRequest('GET', 'appId', '/some/path', null, {limit: 25, offset: 25}));
  });

  it('Rejects non-string appId', async () => {
    let error;
    try {
      await payClient.get(10, '/some/path');
    } catch (e) {
      error = e;
    }
    should.exist(error);
  });

  it('Rejects invalid resource', async () => {
    let error;
    try {
      await payClient.get('appId', '/some/path?appId=15');
    } catch (e) {
      error = e;
    }
    should.exist(error);
  });

  it('Throws server error', async () => {
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
    let stubs;

    beforeEach(() => {
      stubs = {
        list: sinon.stub(payClient, 'list').resolves({}),
        get: sinon.stub(payClient, 'get').resolves({}),
        post: sinon.stub(payClient, 'post').resolves({}),
        put: sinon.stub(payClient, 'put').resolves({}),
        del: sinon.stub(payClient, 'del').resolves({})
      };
    });

    afterEach(() => {
      stubs = null;
    });

    it('Get', async () => {
      let obj = await payClient.forAppId('appId').get('/some/path');
      obj.should.be.eql({});
      stubs.get.should.have.been.calledOnce();
    });

    it('Post', async () => {
      let obj = await payClient.forAppId('appId').post('/some/path', {});
      obj.should.be.eql({});
      stubs.post.should.have.been.calledOnce();
    });

    it('Put', async () => {
      let obj = await payClient.forAppId('appId').put('/some/path', {});
      obj.should.be.eql({});
      stubs.put.should.have.been.calledOnce();
    });

    it('Del(ete)', async () => {
      let obj = await payClient.forAppId('appId').del('/some/path', {});
      obj.should.be.eql({});
      stubs.del.should.have.been.calledOnce();
    });

    it('List', async () => {
      let obj = await payClient.forAppId('appId').list('/some/path');
      obj.should.be.eql({});
      stubs.list.should.have.been.calledOnce();
    });

    it('Rejects non-string appId', async () => {
      let error;
      try {
        payClient.forAppId(10);
      } catch (e) {
        error = e;
      }
      should.exist(error);
    });

  });
});
