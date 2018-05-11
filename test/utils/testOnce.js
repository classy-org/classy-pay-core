const sinon = require('sinon');
const should = require('should');
require('should-sinon');
const rewire = require('rewire');
const Once = rewire('../../src/utils/Once');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('Once', () => {
  it('Calls code only once', async () => {
    const stub = sinon.stub().resolves(null);
    let complete = false;
    const once = new Once(async () => {
      while (complete == false) {
        await sleep(1);
      }
      stub();
    });
    once.done.should.be.equal(false);
    complete = true;
    await once.do();
    await once.do();
    stub.should.be.calledOnce();
    once.done.should.be.equal(true);
  });
});
