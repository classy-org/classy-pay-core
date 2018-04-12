require('source-map-support').install();
const keys = JSON.parse(process.argv[4]);

const tests = [
  () => {
    const Config = require('../lib/config.js')({
      environments: require('./environment.json'),
      stage: 'dev',
      factories: [require('../lib/credstash.js')({
        table: process.argv[2],
        region: process.argv[3],
        keys
      })]
    });

    const f = async () => {
      try {
        console.log('Async test: sample key = ' + await Config.get('SAMPLE_KEY'));
        console.log('Async test: first config key = ' + await Config.get(keys[0]));
      } catch (error) {
        console.error(error);
      };
    };

    f();
  },
  () => {
    const Config = require('../lib/config.js')({
      environments: require('./environment.json'),
      stage: 'dev',
      factories: [require('../lib/credstash.js')({
        table: process.argv[2],
        region: process.argv[3],
        keys
      })]
    }).legacy();

    Config.initialize().then(() => {
      console.log('Promise test: sample key = ' + Config.get('SAMPLE_KEY'));
      console.log('Promise test: first config key = ' + Config.get(keys[0]));
    }).catch(error => {
      console.error(error);
    });
  }
];

for (let test of tests) {
  test();
}
