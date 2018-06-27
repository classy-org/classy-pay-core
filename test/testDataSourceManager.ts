import sinon = require('sinon');
import should = require('should');
require('should-sinon');

import DataSourceManager from '../src/DataSourceManager';
import DataSource, {DataSourceConfig} from "../lib/src/DataSource";

describe('Data Source Manager', async () => {
  it('Success Case', async () => {
    const dataSource: DataSource  = {
      initialize: (config: DataSourceConfig) => new Promise<void>(resolve => resolve()),
      get: (key: string) => new Promise<void>(resolve => resolve()),
      name: () => 'mock'
    };
    const dataSourceMock = sinon.mock(dataSource);
    const dataSourceConfig = {
      get: (key: string) => new Promise<void>(resolve => resolve()),
    };
    dataSourceMock.expects('initialize').withArgs(dataSourceConfig).once().resolves();
    dataSourceMock.expects('get').withArgs('key1').once().returns('value1');
    dataSourceMock.expects('get').withArgs('key2').once().returns('value2');

    const manager = new DataSourceManager(dataSource, dataSourceConfig);
    (await manager.get('key1')).should.be.eql('value1');
    (await manager.get('key2')).should.be.eql('value2');

    dataSourceMock.verify();
  });

  it('Errors on null Data Source', async () => {
    let error;
    try {
      // @ts-ignore testing non-ts usage
      new DataSourceManager(null, null);
    } catch (e) {
      error = e;
    }
    should.exist(error);
  });
});
