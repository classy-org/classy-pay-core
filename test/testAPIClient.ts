import sinon = require('sinon');
import should = require('should');
import mock = require('mock-require');
import { oauth2tokenCallback } from 'oauth';

import { APIClient } from '../src/APIClient';
import { normalizeUrl, JSONParseBig } from '../src/utils/utils';
require('should-sinon');

const SUCCESSFUL_EMPTY_JSON_RESPONSE = {
  statusCode: 200,
  headers: {
    'content-type': ['application/json'],
  },
  body: '{}',
};

const SUCCESSFUL_JSON_RESPONSE = (data: any, nextPage?: string) => ({
  statusCode: 200,
  headers: {
    'content-type': ['application/json'],
    'next_page_url': nextPage,
  },
  body: JSON.stringify({data: [data]}),
});

const BAD_RESPONSE = {
  statusCode: 500,
  headers: {
    'content-type': ['application/json'],
  },
  body: 'Server error!',
};

describe('API Client', () => {
  const requestStub = sinon.stub();
  const oauth2Stub = sinon.stub();
  const oauth = {
    OAuth2: class {
      private clientId: string;
      private clientSecret: string;
      private baseSite: string;
      private accessTokenPath: string;

      constructor(
        clientId: string,
        clientSecret: string,
        baseSite: string,
        authorizePath: undefined,
        accessTokenPath: string,
      ) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.baseSite = baseSite;
        this.accessTokenPath = accessTokenPath;
      }

      public async getOAuthAccessToken(
        code: string,
        params: any,
        callback: oauth2tokenCallback,
      ) {
        let error;
        let result: string = '';
        try {
          result = <string> await oauth2Stub(
            this.clientId,
            this.clientSecret,
            this.baseSite,
            this.accessTokenPath,
            code,
            params);
        } catch (e) {
          error = e;
        } finally {
          callback(error, result, result, undefined);
        }
      }
    },
  };
  let apiClient: APIClient;

  beforeEach(() => {
    mock('../src/utils/utils', {requestWithLogs: requestStub, normalizeUrl, JSONParseBig});
    mock('oauth', oauth);
    const mockAPIClient = mock.reRequire('../src/APIClient');
    apiClient = <APIClient> new mockAPIClient.APIClient(
      '##ID##',
      '##SECRET##',
      'https://stagingapi.stayclassy.org/2.0',
      'https://stagingapi.stayclassy.org',
    );
  });

  afterEach(() => {
    mock.stopAll();
    requestStub.reset();
    oauth2Stub.reset();
  });

  it('GET request', async () => {
    oauth2Stub.resolves('##BEARER_TOKEN##');
    requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);

    await apiClient.get('/some/path/to/something?q=some_query_param');

    oauth2Stub.getCalls().length.should.be.eql(1);
    oauth2Stub.getCalls()[0].args.should.be.eql([
      '##ID##',
      '##SECRET##',
      'https://stagingapi.stayclassy.org/2.0',
      '/oauth2/auth',
      '',
      { grant_type: 'client_credentials' },
    ]);
    requestStub.getCalls().length.should.be.eql(1);
    requestStub.getCalls()[0].args.should.be.eql([{
      url: 'https://stagingapi.stayclassy.org/some/path/to/something?q=some_query_param',
      timeout: 120000,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ##BEARER_TOKEN##',
        'User-Agent': 'ClassyPay Node.JS',
      },
      resolveWithFullResponse: true,
    }, undefined]);
  });

  it('GET request with pagination', async () => {
    oauth2Stub.resolves('##BEARER_TOKEN##');
    requestStub.onCall(0).resolves(SUCCESSFUL_JSON_RESPONSE(
      {a: 'b'},
      'https://stagingapi.stayclassy.org/some/path/to/something?q=some_query_param&page=2'),
    );
    requestStub.onCall(1).resolves(SUCCESSFUL_JSON_RESPONSE(
      {c: 'd'},
      'https://stagingapi.stayclassy.org/some/path/to/something?q=some_query_param&page=3'),
    );
    requestStub.onCall(2).resolves(SUCCESSFUL_JSON_RESPONSE({e: 'f'}));

    const result = await apiClient.getAll('/some/path/to/something?q=some_query_param');

    // returning back as [Object {},...] vs [{}, ...], doing below as a way to convert back to fix test
    const resultResponse = JSON.parse(JSON.stringify(result));
    resultResponse.should.be.eql([{a: 'b'}, {c: 'd'}, {e: 'f'}]);
    oauth2Stub.getCalls().length.should.be.eql(1);
    oauth2Stub.getCalls()[0].args.should.be.eql([
      '##ID##',
      '##SECRET##',
      'https://stagingapi.stayclassy.org/2.0',
      '/oauth2/auth',
      '',
      { grant_type: 'client_credentials' },
    ]);
    requestStub.getCalls().length.should.be.eql(3);
    requestStub.getCalls()[0].args.should.be.eql([{
      url: 'https://stagingapi.stayclassy.org/some/path/to/something?q=some_query_param',
      timeout: 120000,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ##BEARER_TOKEN##',
        'User-Agent': 'ClassyPay Node.JS',
      },
      resolveWithFullResponse: true,
    }, undefined]);
    requestStub.getCalls()[1].args.should.be.eql([{
      url: 'https://stagingapi.stayclassy.org/some/path/to/something?q=some_query_param&page=2',
      timeout: 120000,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ##BEARER_TOKEN##',
        'User-Agent': 'ClassyPay Node.JS',
      },
      resolveWithFullResponse: true,
    }, undefined]);
    requestStub.getCalls()[2].args.should.be.eql([{
      url: 'https://stagingapi.stayclassy.org/some/path/to/something?q=some_query_param&page=3',
      timeout: 120000,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ##BEARER_TOKEN##',
        'User-Agent': 'ClassyPay Node.JS',
      },
      resolveWithFullResponse: true,
    }, undefined]);
  });

  it('POST request', async () => {
    oauth2Stub.resolves('##BEARER_TOKEN##');
    requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);

    await apiClient.post('/some/path/to/something/else', { fake: 'body' });

    oauth2Stub.getCalls().length.should.be.eql(1);
    oauth2Stub.getCalls()[0].args.should.be.eql([
      '##ID##',
      '##SECRET##',
      'https://stagingapi.stayclassy.org/2.0',
      '/oauth2/auth',
      '',
      { grant_type: 'client_credentials' },
    ]);
    requestStub.getCalls().length.should.be.eql(1);
    requestStub.getCalls()[0].args.should.be.eql([{
      url: 'https://stagingapi.stayclassy.org/some/path/to/something/else',
      timeout: 120000,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ##BEARER_TOKEN##',
        'User-Agent': 'ClassyPay Node.JS',
        'Content-Type': 'application/json',
      },
      body: '{"fake":"body"}',
      resolveWithFullResponse: true,
    }, undefined]);
  });

  it('PUT request', async () => {
    oauth2Stub.resolves('##BEARER_TOKEN##');
    requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);

    await apiClient.put('/some/path/to/something/else', { fake: 'body' });

    oauth2Stub.getCalls().length.should.be.eql(1);
    oauth2Stub.getCalls()[0].args.should.be.eql([
      '##ID##',
      '##SECRET##',
      'https://stagingapi.stayclassy.org/2.0',
      '/oauth2/auth',
      '',
      { grant_type: 'client_credentials' },
    ]);
    requestStub.getCalls().length.should.be.eql(1);
    requestStub.getCalls()[0].args.should.be.eql([{
      url: 'https://stagingapi.stayclassy.org/some/path/to/something/else',
      timeout: 120000,
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ##BEARER_TOKEN##',
        'User-Agent': 'ClassyPay Node.JS',
        'Content-Type': 'application/json',
      },
      body: '{"fake":"body"}',
      resolveWithFullResponse: true,
    }, undefined]);
  });

  it('DELETE request', async () => {
    oauth2Stub.resolves('##BEARER_TOKEN##');
    requestStub.resolves(SUCCESSFUL_EMPTY_JSON_RESPONSE);

    await apiClient.del('/some/path/to/something/we/want/to/delete');

    oauth2Stub.getCalls().length.should.be.eql(1);
    oauth2Stub.getCalls()[0].args.should.be.eql([
      '##ID##',
      '##SECRET##',
      'https://stagingapi.stayclassy.org/2.0',
      '/oauth2/auth',
      '',
      { grant_type: 'client_credentials' },
    ]);
    requestStub.getCalls().length.should.be.eql(1);
    requestStub.getCalls()[0].args.should.be.eql([{
      url: 'https://stagingapi.stayclassy.org/some/path/to/something/we/want/to/delete',
      timeout: 120000,
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ##BEARER_TOKEN##',
        'User-Agent': 'ClassyPay Node.JS',
      },
      resolveWithFullResponse: true,
    }, undefined]);
  });

  it('Invalid GET request', async () => {
    oauth2Stub.resolves('##BEARER_TOKEN##');
    requestStub.resolves(BAD_RESPONSE);

    let error;
    let result;
    try {
      result = await apiClient.get('/some/path/to/something?q=some_query_param');
    } catch (e) {
      error = e;
    }

    oauth2Stub.getCalls().length.should.be.eql(1);
    oauth2Stub.getCalls()[0].args.should.be.eql([
      '##ID##',
      '##SECRET##',
      'https://stagingapi.stayclassy.org/2.0',
      '/oauth2/auth',
      '',
      { grant_type: 'client_credentials' },
    ]);
    requestStub.getCalls().length.should.be.eql(1);
    requestStub.getCalls()[0].args.should.be.eql([{
      url: 'https://stagingapi.stayclassy.org/some/path/to/something?q=some_query_param',
      timeout: 120000,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ##BEARER_TOKEN##',
        'User-Agent': 'ClassyPay Node.JS',
      },
      resolveWithFullResponse: true,
    }, undefined]);

    should.not.exist(result);
    should.exist(error);

    error.toString().should.be.eql('Error: API client received status code 500: Server error!');
  });

  it('Bad OAuth2 Credentials', async () => {
    oauth2Stub.throwsException(new Error('OAuth Error'));

    let error;
    let result;
    try {
      result = await apiClient.get('/some/path/to/something?q=some_query_param');
    } catch (e) {
      error = e;
    }

    oauth2Stub.getCalls().length.should.be.eql(1);
    oauth2Stub.getCalls()[0].args.should.be.eql([
      '##ID##',
      '##SECRET##',
      'https://stagingapi.stayclassy.org/2.0',
      '/oauth2/auth',
      '',
      { grant_type: 'client_credentials' },
    ]);
    requestStub.getCalls().length.should.be.eql(0);

    should.not.exist(result);
    should.exist(error);

    error.toString().should.be.eql('Error: OAuth Error');
  });
});
