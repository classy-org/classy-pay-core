import sinon = require('sinon');
import should = require('should');
require('should-sinon');
import * as _ from 'lodash';

import { normalizeUrl, stringToBoolean, redact, sequelizeCloneDeep, recurse } from '../../src/utils/utils';

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
          return value.toJSON ? 'STOP' : 'RECURSE_DEEPER';
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
});
