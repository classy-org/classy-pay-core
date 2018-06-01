const sinon = require('sinon');
const should = require('should');
require('should-sinon');
const DataSourceManager = require('../src/DataSourceManager');

describe('Data Source Manager', async () => {
  it('Success Case', async () => {
    const dataSource = {
      initialize: () => {},
      get: () => {}
    };
    const dataSourceMock = sinon.mock(dataSource);
    dataSourceMock.expects('initialize').withArgs('config').once().resolves();
    dataSourceMock.expects('get').withArgs('key1').once().returns('value1');
    dataSourceMock.expects('get').withArgs('key2').once().returns('value2');

    const manager = new DataSourceManager(dataSource, 'config');
    (await manager.get('key1')).should.be.eql('value1');
    (await manager.get('key2')).should.be.eql('value2');

    dataSourceMock.verify();
  });

  it('Errors on null Data Source', async () => {
    let error;
    try {
      new DataSourceManager(null, null);
    } catch (e) {
      error = e;
    }
    should.exist(error);
  });
});
