const sinon = require('sinon');
const should = require('should');
require('should-sinon');
const _ = require('lodash');
const Config = require('../src/Config');

describe('Config', () => {
  let config;
  let dataSources;
  let dataSourceMocks;

  beforeEach(() => {
    dataSources = _.map(_.range(2), () => ({initialize: () => {}, get: () => {}}));
    dataSourceMocks = _.map(dataSources, dataSource => (sinon.mock(dataSource)));
    config = new Config(dataSources);
  });

  afterEach(() => {
    dataSources = null;
    dataSourceMocks = null;
    config = null;
  });

  it('First data source has item', async () => {
    dataSourceMocks[0].expects('initialize').once();
    dataSourceMocks[0].expects('get').withArgs('key').once().resolves('value');
    dataSourceMocks[1].expects('initialize').never();
    dataSourceMocks[1].expects('get').never();
    const value = await config.get('key');
    value.should.be.eql('value');
    for (const mock of dataSourceMocks) mock.verify();
  });

  it('Second data source has item', async () => {
    dataSourceMocks[0].expects('initialize').once();
    dataSourceMocks[1].expects('initialize').once();
    dataSourceMocks[0].expects('get').withArgs('key').once().resolves(null);
    dataSourceMocks[1].expects('get').withArgs('key').once().resolves('value');
    const value = await config.get('key');
    value.should.be.eql('value');
    for (const mock of dataSourceMocks) mock.verify();
  });

  it('No data source has item', async () => {
    dataSourceMocks[0].expects('initialize').once();
    dataSourceMocks[1].expects('initialize').once();
    dataSourceMocks[0].expects('get').withArgs('key').once().resolves(null);
    dataSourceMocks[1].expects('get').withArgs('key').once().resolves(null);
    const value = await config.get('key');
    should.not.exist(value);
    for (const mock of dataSourceMocks) mock.verify();
  });

  it('Data source that queryies for itself should abort', async () => {
    dataSourceMocks[0].expects('initialize').once().callsFake(async config => {
      await config.get('key');
    });
    dataSourceMocks[0].expects('get').withArgs('key').once().resolves('value');
    dataSourceMocks[1].expects('initialize').never();
    dataSourceMocks[1].expects('get').never();
    const value = await config.get('key');
    value.should.be.eql('value');
    for (const mock of dataSourceMocks) mock.verify();
  });
});
