import should = require('should');
import mock = require('mock-require');

import { DataSourceConfig } from '../../src/DataSource';
require('should-sinon');

const buildConfig = (values: { [index: string]: any }): DataSourceConfig => ({
  get: async (key: string) => values[key],
});

describe('ReplacerDataSource', () => {
  let replacerDataSource: any;

  beforeEach(() => {
    // The data source module exports a singleton; re-require for isolation.
    replacerDataSource = mock.reRequire('../../src/DataSources/Replacer');
  });

  it('is named Replacer', async () => {
    replacerDataSource.name().should.be.equal('Replacer');
  });

  it('provides no replacer when there is no security config', async () => {
    await replacerDataSource.initialize(buildConfig({}));
    should.not.exist(await replacerDataSource.get('Replacer'));
  });

  it('throws when the security config is partial', async () => {
    await replacerDataSource.initialize(buildConfig({
      'security': { obfuscate: ['customKey'] },
      'security.obfuscate': ['customKey'],
    })).should.be.rejected();
  });

  it('only answers for the Replacer key', async () => {
    await replacerDataSource.initialize(buildConfig({
      'security': { obfuscate: ['customKey'], replacement: '[HIDDEN]' },
      'security.obfuscate': ['customKey'],
      'security.replacement': '[HIDDEN]',
    }));
    should.not.exist(await replacerDataSource.get('somethingElse'));
  });

  it('builds a record-level replacer from configured keys merged with defaults', async () => {
    await replacerDataSource.initialize(buildConfig({
      'security': { obfuscate: ['customKey'], replacement: '[HIDDEN]' },
      'security.obfuscate': ['customKey'],
      'security.replacement': '[HIDDEN]',
    }));
    const replacer = await replacerDataSource.get('Replacer');
    should.exist(replacer);

    const input = {
      customKey: 'sensitive',
      accessToken: 'access-production-123',
      nested: [{ email: 'user@example.com' }],
      safe: 'ok',
    };
    const output = replacer(input);

    // Configured key redacted with the configured censor value.
    output.customKey.should.be.equal('[HIDDEN]');
    // Default keys act as a safety net and use the configured censor value.
    output.accessToken.should.be.equal('[HIDDEN]');
    output.nested[0].email.should.be.equal('[HIDDEN]');
    // Non-sensitive values pass through.
    output.safe.should.be.equal('ok');
    // The input record is not mutated.
    input.customKey.should.be.equal('sensitive');
    input.nested[0].email.should.be.equal('user@example.com');
  });

  describe('backwards compatible (key, value) mode', () => {
    let replacer: any;

    beforeEach(async () => {
      await replacerDataSource.initialize(buildConfig({
        'security': { obfuscate: ['customKey'], replacement: '[HIDDEN]' },
        'security.obfuscate': ['customKey'],
        'security.replacement': '[HIDDEN]',
      }));
      replacer = await replacerDataSource.get('Replacer');
    });

    it('censors the value of a configured key', async () => {
      replacer('customKey', 'sensitive').should.be.equal('[HIDDEN]');
    });

    it('censors the value of a default key', async () => {
      replacer('email', 'user@example.com').should.be.equal('[HIDDEN]');
    });

    it('passes through the value of a non-sensitive key', async () => {
      replacer('safeKey', 'ok').should.be.equal('ok');
    });

    it('deep-redacts sensitive keys nested inside the value', async () => {
      const output = replacer('payload', { paymentToken: { accessToken: 'tok_123' }, safe: 'ok' });
      output.paymentToken.accessToken.should.be.equal('[HIDDEN]');
      output.safe.should.be.equal('ok');
    });
  });
});
