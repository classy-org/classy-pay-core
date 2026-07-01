import sinon = require('sinon');
import should = require('should');
import mock = require('mock-require');
import * as _ from 'lodash';

// tslint:disable-next-line:max-line-length
import { normalizeUrl, stringToBoolean, redact, omitDeepWithKeys, sequelizeCloneDeep, recurse, runFunctionAfterDelay } from '../../src/utils/utils';
require('should-sinon');

describe('Normalizer', () => {

  const runTest = (inputUrl: string, expectedOutput: string) => {
    it(`${inputUrl} should normalize to ${expectedOutput}`, async () => {
      const output = normalizeUrl(inputUrl);
      output.should.be.equal(expectedOutput);
    });
  };

  runTest('http://api.classy.org/', 'http://api.classy.org/');
  runTest('http://api.classy.org', 'http://api.classy.org/');
  runTest('http://api.classy.org?q=1', 'http://api.classy.org/?q=1');
  runTest('http://api.classy.org//', 'http://api.classy.org/');
  runTest('http://api.classy.org//a', 'http://api.classy.org/a');
  runTest('http://api.classy.org//a/', 'http://api.classy.org/a/');
  runTest('http://api.classy.org//a//', 'http://api.classy.org/a/');
  runTest('http://api.classy.org//a//b///////c///', 'http://api.classy.org/a/b/c/');
});

describe('stringToBoolean', () => {

  const runTest = (input: string, expectedOutput: boolean) => {
    it(`${input} should equate to boolean ${expectedOutput}`, async () => {
      const output = stringToBoolean(input);
      output.should.be.equal(expectedOutput);
    });
  };

  runTest('true', true);
  runTest('TRUE', true);
  runTest('True', true);
  runTest('false', false);
  runTest('False', false);
  runTest('FALSE', false);
  runTest('SmiggenSmoggen', false);
  runTest('0', false);
  runTest('1', true);
  runTest('10000', true);
});

describe('Redact', () => {
  const runTest = (description: string, input: any, expectedOutput: any) => {
    it(`Redact: ${description}`, async () => {
      const output = redact(input);
      output.should.be.eql(expectedOutput);
    });
  };

  runTest(`Request Options`, {
    url: 'https://api.classy.org/2.0/recurring-donation-plans/213492/transactions',
    timeout: 10000,
    method: 'POST',
    headers: {
      'Authorization': 'Bearer abcdefghijklmnop',
      'User-Agent': 'ClassyPay Node.JS',
      'Content-Type': 'application/json',
    },
    resolveWithFullResponse: true,
    body: 'body',
    simple: true,
    transform2xxOnly: false,
  }, {
    url: 'https://api.classy.org/2.0/recurring-donation-plans/213492/transactions',
    timeout: 10000,
    method: 'POST',
    headers: {
      'Authorization': '*** REDACTED ***',
      'User-Agent': 'ClassyPay Node.JS',
      'Content-Type': 'application/json',
    },
    resolveWithFullResponse: true,
    body: 'body',
    simple: true,
    transform2xxOnly: false,
  });

  runTest(`Response`, {
    statusCode: 400,
    body: '{\'error\':{\'member_id\':[\'Member can not be in a deleted or locked state.\']}}',
    headers: {
      'date': 'Sun, 26 Aug 2018 09:29:13 GMT',
      'content-type': 'application/json',
      'content-length': '75',
      'connection': 'close',
      'cache-control': 'no-cache',
      'server': 'nginx',
      'x-kong-limit': 'time-consumed=100',
      'x-kong-upstream-latency': '103',
      'x-kong-proxy-latency': '1',
      'via': 'kong/0.9.3',
    },
    request: {
      uri: {
        protocol: 'https:',
        slashes: true,
        auth: null,
        host: 'api.classy.org',
        port: 443,
        hostname: 'api.classy.org',
        hash: null,
        search: null,
        query: null,
        pathname: '/2.0/recurring-donation-plans/213492/transactions',
        path: '/2.0/recurring-donation-plans/213492/transactions',
        href: 'https://api.classy.org/2.0/recurring-donation-plans/213492/transactions',
      },
      method: 'POST',
      headers: {
        'Authorization': 'Bearer abcdefghijklmnop',
        'User-Agent': 'ClassyPay Node.JS',
        'Content-Type': 'application/json',
        'content-length': 5857,
      },
    },
  }, {
    statusCode: 400,
    body: '{\'error\':{\'member_id\':[\'Member can not be in a deleted or locked state.\']}}',
    headers: {
      'date': 'Sun, 26 Aug 2018 09:29:13 GMT',
      'content-type': 'application/json',
      'content-length': '75',
      'connection': 'close',
      'cache-control': 'no-cache',
      'server': 'nginx',
      'x-kong-limit': 'time-consumed=100',
      'x-kong-upstream-latency': '103',
      'x-kong-proxy-latency': '1',
      'via': 'kong/0.9.3',
    },
    request: {
      uri: {
        protocol: 'https:',
        slashes: true,
        auth: null,
        host: 'api.classy.org',
        port: 443,
        hostname: 'api.classy.org',
        hash: null,
        search: null,
        query: null,
        pathname: '/2.0/recurring-donation-plans/213492/transactions',
        path: '/2.0/recurring-donation-plans/213492/transactions',
        href: 'https://api.classy.org/2.0/recurring-donation-plans/213492/transactions',
      },
      method: 'POST',
      headers: {
        'Authorization': '*** REDACTED ***',
        'User-Agent': 'ClassyPay Node.JS',
        'Content-Type': 'application/json',
        'content-length': 5857,
      },
    },
  });
});

describe('omitDeepWithKeys non-writable properties', () => {
  // Builds an object whose `source` is an accessor on its prototype, rather
  // than an own property. This reproduces the production failure: _.cloneDeep
  // converts own getters into writable values but preserves the prototype, so
  // an inherited getter-only accessor survives the clone. `hasSetter` controls
  // whether a setter is also present.
  const withPrototypeAccessor = (ownProps: object, hasSetter = false) => {
    let backing = 'card';
    const descriptor: PropertyDescriptor = {
      enumerable: false,
      configurable: true,
      get: () => backing,
    };
    if (hasSetter) {
      descriptor.set = (value: string) => { backing = value; };
    }
    const proto = {};
    Object.defineProperty(proto, 'source', descriptor);
    return Object.assign(Object.create(proto), ownProps);
  };

  it('does not throw and skips a getter-only property inherited from a prototype', () => {
    let output: any;
    (() => {
      output = omitDeepWithKeys(
        withPrototypeAccessor({ email: 'user@example.com' }),
        ['email', 'source'],
        '*** REDACTED ***',
      );
    }).should.not.throw();

    // Writable property is redacted as normal.
    output.email.should.be.equal('*** REDACTED ***');
    // Getter-only property is left intact rather than crashing.
    output.source.should.be.equal('card');
  });

  it('does not throw on the delete path (no replacement value) for a prototype getter-only property', () => {
    let output: any;
    (() => {
      // No replacementValue => delete path. Deleting an inherited accessor is a
      // no-op rather than a crash.
      output = omitDeepWithKeys(
        withPrototypeAccessor({ email: 'user@example.com' }),
        ['email', 'source'],
      );
    }).should.not.throw();

    // Writable own property is removed.
    should.not.exist(output.email);
    // Inherited getter is untouched and still readable.
    output.source.should.be.equal('card');
  });

  it('redacts a getter property that also has a setter', () => {
    let output: any;
    (() => {
      output = omitDeepWithKeys(
        withPrototypeAccessor({}, true),
        ['source'],
        '*** REDACTED ***',
      );
    }).should.not.throw();

    // A setter exists, so the value can be (and is) redacted.
    output.source.should.be.equal('*** REDACTED ***');
  });

  it('redacts nested writable properties even when a sibling is getter-only', () => {
    const input = {
      outer: {
        email: 'user@example.com',
        nested: withPrototypeAccessor({}),
      },
    };

    let output: any;
    (() => {
      output = omitDeepWithKeys(input, ['email', 'source'], '*** REDACTED ***');
    }).should.not.throw();

    output.outer.email.should.be.equal('*** REDACTED ***');
    output.outer.nested.source.should.be.equal('card');
  });
});

describe('requestWithLogs', () => {
  // A response shaped like a real axios response: it carries the Node
  // http.ClientRequest (sockets, raw `Authorization` header string) and a
  // `config` whose `data` is the request body as a serialized JSON string.
  // Neither is reachable by key-based redaction, so they must not be logged.
  const SECRET_TOKEN = 'h72deiQjXxCZLlv1';
  const buildAxiosResponse = () => {
    const requestBody = {
      first_name: 'Taz',
      email: 'thammer@test.com',
      address1: '580 Memorial Road',
      metadata: { token: SECRET_TOKEN },
    };
    return {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { ok: true, email: 'thammer@test.com' },
      config: {
        url: 'https://api.example.org/x',
        method: 'put',
        // Serialized request body — PII is inside a string here.
        data: JSON.stringify(requestBody),
        headers: { Authorization: 'Bearer ' + SECRET_TOKEN },
      },
      request: {
        // Raw HTTP header string containing the bearer token in plaintext.
        _header: 'PUT /x HTTP/1.1\nAuthorization: Bearer ' + SECRET_TOKEN + '\n\n',
        socket: { _tlsOptions: { session: { type: 'Buffer', data: [1, 2, 3] } } },
      },
    };
  };

  let requestWithLogs: any;
  let logInfoArg: any;

  const setupWithAxios = (axiosImpl: any) => {
    mock('axios', axiosImpl);
    requestWithLogs = mock.reRequire('../../src/utils/utils').requestWithLogs;
  };

  afterEach(() => {
    mock.stopAll();
    logInfoArg = undefined;
  });

  it('does not log config, request, sockets, or the serialized request body on success', async () => {
    const axiosImpl: any = async () => buildAxiosResponse();
    axiosImpl.isAxiosError = () => false;
    setupWithAxios(axiosImpl);

    const log: any = {
      info: (obj: any) => { logInfoArg = obj; },
      error: () => { /* not expected */ },
    };

    await requestWithLogs({ url: 'https://api.example.org/x', method: 'PUT' }, log);

    should.exist(logInfoArg);
    // The whole axios object must not be dumped.
    should.not.exist(logInfoArg.response.config);
    should.not.exist(logInfoArg.response.request);
    // Only the safe projection survives.
    logInfoArg.response.status.should.equal(200);
    logInfoArg.response.statusText.should.equal('OK');

    // The bearer token must appear nowhere in the serialized log payload.
    const serialized = JSON.stringify(logInfoArg);
    serialized.should.not.containEql(SECRET_TOKEN);
    // Response-body PII is still redacted by key.
    logInfoArg.response.data.email.should.equal('*** REDACTED ***');
  });

  it('does not leak the raw request/config on error responses', async () => {
    const axiosError: any = new Error('boom');
    axiosError.config = { data: JSON.stringify({ token: SECRET_TOKEN }) };
    axiosError.request = { _header: 'Authorization: Bearer ' + SECRET_TOKEN };
    axiosError.response = { status: 500, statusText: 'ERR', headers: {}, data: 'nope' };

    const axiosImpl: any = async () => { throw axiosError; };
    axiosImpl.isAxiosError = (e: any) => e === axiosError;
    setupWithAxios(axiosImpl);

    let errorArg: any;
    const log: any = {
      info: () => { /* not expected */ },
      error: (obj: any) => { errorArg = obj; },
    };

    let threw = false;
    try {
      await requestWithLogs({ url: 'https://api.example.org/x', method: 'PUT' }, log);
    } catch (e) {
      threw = true;
    }
    threw.should.equal(true);

    should.exist(errorArg);
    should.not.exist(errorArg.error.config);
    should.not.exist(errorArg.error.request);
    errorArg.error.message.should.equal('boom');
    JSON.stringify(errorArg).should.not.containEql(SECRET_TOKEN);
  });
});

describe(`Sequelize CloneDeep`, () => {
  const runTest = (description: string, input: any, expectedOutput: any) => {
    it(`Redact: ${description}`, async () => {
      const output = sequelizeCloneDeep(input);
      if (expectedOutput) {
        should.exist(output);
      } else {
        should.not.exist(output);
      }
      if (output) {
        output.should.be.eql(expectedOutput);

        const outputObjects: Array<any> = [];
        const inputObjects: Array<any> = [];
        await recurse(output, (type, value) => {
          outputObjects.push(value);
          return 'RECURSE_DEEPER';
        });
        await recurse(input, (type, value) => {
          inputObjects.push(value);
          return value && value.toJSON ? 'STOP' : 'RECURSE_DEEPER';
        });
        for (const x of outputObjects) {
          for (const y of inputObjects) {
            if ((Array.isArray(x) || _.isObject(x)) && (Array.isArray(y) || _.isObject(y))) {
              x.should.not.be.equal(y);
            }
          }
        }
      }
    });
  };

  runTest(`Nominal case`, {a: {b: 'c'}}, {a: {b: 'c'}});

  const createProxy = () => {
    let y: any;
    const toJSON = () => ({});
    return new Proxy({}, {
      get: (obj, prop) => {
        if (prop === 'y') {
          if (!y) y = createProxy();
          return y;
        }
        if (prop === 'toJSON') {
          return toJSON;
        }
        return undefined;
      },
      ownKeys: () => ['y'],
      getOwnPropertyDescriptor: (target, prop) => {
        if (prop === 'y') {
          if (!y) y = createProxy();
          return { configurable: true, enumerable: true, value: y };
        }
        if (prop === 'toJSON') {
          if (!y) y = createProxy();
          return { configurable: true, enumerable: true, value: toJSON };
        }
        return undefined;
      },
    });
  };
  runTest(`Proxy with toJSON`, createProxy(), {});

  runTest(`Array of proxies with toJSON`, [createProxy(), createProxy()], [{}, {}]);

  runTest(`Undefined`, undefined, undefined);

  runTest(`Undefined values`, { something: undefined }, { something: undefined });
});

describe('runFunctionAfterDelay', () => {
  const result = {id: 1};
  let funcStub: any;

  afterEach( () => {
    funcStub.reset();
  });

  it('should resolve the value', async () => {
    funcStub = sinon.stub().resolves(result);
    const actual = await runFunctionAfterDelay(1000, funcStub);
    funcStub.should.be.calledOnce();
    actual.should.eql(result);
  });

  it('should reject the value', async () => {
    funcStub = sinon.stub().throws(new Error('test'));
    await runFunctionAfterDelay(1000, funcStub).should.be.rejected();
    funcStub.should.be.calledOnce();
  });
});
