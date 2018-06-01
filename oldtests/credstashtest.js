require('source-map-support').install();
const keys = JSON.parse(process.argv[4]);

const tests = [
  () => {
    const Credstash = require('../lib/credstash.js')({
      table: process.argv[2],
      region: process.argv[3],
      keys
    });

    const f = async () => {
      try {
        console.log('Async result: ' + await Credstash.get(keys[0]));
      } catch (error) {
        console.error(error);
      }
    };

    f();
  },
  () => {
    const Credstash = require('../lib/credstash.js')({
      table: process.argv[2],
      region: process.argv[3],
      keys
    }).legacy();

    Credstash.initialize().then(() => {
      console.log('Promise result: ' + Credstash.get(keys[0]));
    }).catch(error => {
      console.error(error);
    });
  }
];

for (let test of tests) {
  test();
}
