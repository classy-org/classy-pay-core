import sinon = require('sinon');
require('should-sinon');
import Once from '../../src/utils/Once';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Once', () => {
  it('Calls code only once', async () => {
    const stub = sinon.stub().resolves(null);
    let complete = false;
    const once = new Once(async () => {
      while (complete === false) {
        await sleep(1);
      }
      stub();
    });
    once.getDone().should.be.equal(false);
    complete = true;
    await once.do();
    await once.do();
    stub.should.be.calledOnce();
    once.getDone().should.be.equal(true);
  });
});
