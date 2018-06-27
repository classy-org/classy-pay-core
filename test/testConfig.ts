import sinon = require('sinon');
import should = require('should');
require('should-sinon');
import _ = require('lodash');
import Config from '../src/Config';
import {SinonMock} from "sinon";
import DataSource, {DataSourceConfig} from "../src/DataSource";

describe('Config', () => {
  let config: Config|undefined;
  let dataSources: Array<DataSource>|undefined;
  let dataSourceMocks: Array<SinonMock>|undefined;

  beforeEach(() => {
    dataSources = _.map(_.range(2), () => ({
      initialize: (config: DataSourceConfig) => new Promise<void>(resolve => resolve()),
      get: (key: string) => new Promise<void>(resolve => resolve()),
      name: () => 'mock'
    }));
    dataSourceMocks = _.map(dataSources, dataSource => (sinon.mock(dataSource)));
    config = new Config(dataSources);
  });

  afterEach(() => {
    dataSources = undefined;
    dataSourceMocks = undefined;
    config = undefined;
  });

  it('First data source has item', async () => {
    if (!dataSourceMocks || !config) throw Error('Test not correctly set up');
    dataSourceMocks[0].expects('initialize').once();
    dataSourceMocks[0].expects('get').withArgs('key').once().resolves('value');
    dataSourceMocks[1].expects('initialize').never();
    dataSourceMocks[1].expects('get').never();
    const value = await config.get('key');
    value.should.be.eql('value');
    for (const mock of dataSourceMocks) mock.verify();
  });

  it('Second data source has item', async () => {
    if (!dataSourceMocks || !config) throw Error('Test not correctly set up');
    dataSourceMocks[0].expects('initialize').once();
    dataSourceMocks[1].expects('initialize').once();
    dataSourceMocks[0].expects('get').withArgs('key').once().resolves(null);
    dataSourceMocks[1].expects('get').withArgs('key').once().resolves('value');
    const value = await config.get('key');
    value.should.be.eql('value');
    for (const mock of dataSourceMocks) mock.verify();
  });

  it('No data source has item', async () => {
    if (!dataSourceMocks || !config) throw Error('Test not correctly set up');
    dataSourceMocks[0].expects('initialize').once();
    dataSourceMocks[1].expects('initialize').once();
    dataSourceMocks[0].expects('get').withArgs('key').once().resolves(null);
    dataSourceMocks[1].expects('get').withArgs('key').once().resolves(null);
    const value = await config.get('key');
    should.not.exist(value);
    for (const mock of dataSourceMocks) mock.verify();
  });

  it('Data source that queryies for itself should abort', async () => {
    if (!dataSourceMocks || !config) throw Error('Test not correctly set up');
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
