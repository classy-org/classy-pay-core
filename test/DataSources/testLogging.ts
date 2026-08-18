import should = require('should');
import sinon = require('sinon');
import mock = require('mock-require');

import Config from '../../src/Config';
import { DataSource, DataSourceConfig } from '../../src/DataSource';
require('should-sinon');

const captureStdout = async (f: () => any): Promise<string> => {
  const written: Array<string> = [];
  const stub = sinon.stub(process.stdout, 'write').callsFake((chunk: any): boolean => {
    written.push(String(chunk));
    return true;
  });
  try {
    await f();
  } finally {
    stub.restore();
  }
  return written.join('');
};

const buildConfig = (values: { [index: string]: any }): DataSourceConfig => ({
  get: async (key: string) => values[key],
});

describe('LoggingDataSource', () => {
  let loggingDataSource: any;

  beforeEach(() => {
    // The data source module exports a singleton; re-require for isolation.
    loggingDataSource = mock.reRequire('../../src/DataSources/Logging');
  });

  it('requires a name', async () => {
    await loggingDataSource.initialize(buildConfig({})).should.be.rejected();
  });

  it('vends an unredacted logger when no Replacer is available (historical behavior)', async () => {
    await loggingDataSource.initialize(buildConfig({ name: 'test-app' }));
    const logger = await loggingDataSource.get('Logger');
    should.exist(logger);

    const output = await captureStdout(() => logger.info({ accessToken: 'tok_123' }, 'hello'));
    const record = JSON.parse(output);
    record.name.should.be.equal('test-app');
    record.msg.should.be.equal('hello');
    record.accessToken.should.be.equal('tok_123');
  });

  it('applies the Replacer transform to every log record', async () => {
    const redactUtil = require('../../src/utils/utils').redact;
    await loggingDataSource.initialize(buildConfig({
      name: 'test-app',
      Replacer: (record: any) => redactUtil(record, ['customKey'], '[HIDDEN]'),
    }));
    const logger = await loggingDataSource.get('Logger');

    const output = await captureStdout(() =>
      logger.info({ customKey: 'sensitive', paymentToken: { details: { accessToken: 'tok_123' } } }, 'hello'));
    const record = JSON.parse(output);
    record.name.should.be.equal('test-app');
    record.msg.should.be.equal('hello');
    record.customKey.should.be.equal('[HIDDEN]');
    record.paymentToken.details.accessToken.should.be.equal('[HIDDEN]');
  });

  it('only answers for the Logger key', async () => {
    await loggingDataSource.initialize(buildConfig({ name: 'test-app' }));
    should.not.exist(await loggingDataSource.get('somethingElse'));
  });
});

describe('Logging + Replacer through Config (AWSConfig ordering)', () => {
  // End-to-end verification of the reentrant initialization: LoggingDataSource
  // resolves 'Replacer' during its own initialize. This only works when
  // Replacer is registered before Logging (mirroring AWSConfig), because
  // Config aborts reentrant lookups once iteration reaches a data source that
  // is mid-query.
  const environmentValues: { [index: string]: any } = {
    'name': 'test-app',
    'security': { obfuscate: ['customKey'], replacement: '[HIDDEN]' },
    'security.obfuscate': ['customKey'],
    'security.replacement': '[HIDDEN]',
  };

  const buildEnvironmentDataSource = (values: { [index: string]: any }): DataSource => ({
    initialize: async (config: DataSourceConfig) => undefined,
    get: async (key: string) => values[key],
    name: () => 'FakeEnvironment',
  });

  it('vends a redacting logger when security config is present', async () => {
    const config = new Config([
      buildEnvironmentDataSource(environmentValues),
      mock.reRequire('../../src/DataSources/Replacer'),
      mock.reRequire('../../src/DataSources/Logging'),
    ]);
    const logger = await config.get('Logger');
    should.exist(logger);

    const output = await captureStdout(() =>
      logger.info({ customKey: 'sensitive', accessToken: 'access-production-123', safe: 'ok' }, 'hello'));
    const record = JSON.parse(output);
    record.customKey.should.be.equal('[HIDDEN]');
    record.accessToken.should.be.equal('[HIDDEN]');
    record.safe.should.be.equal('ok');
    record.msg.should.be.equal('hello');
    output.should.not.containEql('sensitive');
    output.should.not.containEql('access-production-123');
  });

  it('vends a plain logger when no security config is present', async () => {
    const config = new Config([
      buildEnvironmentDataSource({ name: 'test-app' }),
      mock.reRequire('../../src/DataSources/Replacer'),
      mock.reRequire('../../src/DataSources/Logging'),
    ]);
    const logger = await config.get('Logger');
    should.exist(logger);

    const output = await captureStdout(() => logger.info({ accessToken: 'tok_123' }, 'hello'));
    JSON.parse(output).accessToken.should.be.equal('tok_123');
  });
});
