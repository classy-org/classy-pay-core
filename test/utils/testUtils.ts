import sinon = require('sinon');
import should = require('should');
require('should-sinon');

import { normalizeUrl, stringToBoolean } from '../../src/utils/utils';

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
