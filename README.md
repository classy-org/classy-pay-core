# classy-lambda-common
Common configuration and tools for Classy Lambda modules.

# installation

 $ npm install --save classy-lambda-common

# prerequisites

Minimally, you must have an environment.json and creds.example.json file in the root of your project.  The JSON content provides a configuration based on which stage you are deployed to:

environment.json
```json
{
  "dev": {
    "aws": {
      "region": "us-west-2"
    }
  },
  "staging": {
    "aws": {
      "region": "us-west-2"
    }
  },
  "production": {
    "aws": {
      "region": "us-east-1"
    }
  }
}
```

creds.example.json
```json
{
  "SECRET": "SHHHH"
}
```

# options

See prerequisites

# supported toolset

*Common.get(key):* works for both static environment key/value pairs (i.e. environment.json), and also CredStash secrets.  For static environment key/value pairs, you can specify nested keys in hierarchy via dot notation, i.e. Common.get('this.is.valid') returns "value" for:

```json
{
  "dev": {
    "this": {
      "is": {
        "valid": "value"
      }
    }
  }
}
```

For CredStash, keys are generally all uppercase with snake case between words, i.e. SOME_SECRET.

*Common.get('Logger'):* Logging facility which requires 'log' configuration.  See example below.

*Common.get('PayClient'):* Client which can be used for requests to Classy Pay.  Requires 'pay' configuration.

*Common.get('ApiClient'):* Client which can be used for requests to Classy API.  Requires 'api' configuration.

*Common.get('Replacer'):* Obfuscator for use with JSON.stringify replacer.  Requires 'security' configuration.

# usage

Bootstrap: Common.load(callback)
```javascript
const Common = require('classy-lambda-common');
Common.load(function(error) {
  if (error) {
    console.error(error);
  } else {
    let logger = Common.get('Logger').create('my-logger');
    logger.info('Hello World');
  }
});
```

Get static config: Common.get(key)
```javascript
let value = Common.get('some.key');
console.log(value);
```

Get CredStash secret: Common.get(key)
```javascript
let value = Common.get('SOME_SECRET');
console.log(value);
```

Get Logger: See Bootstrap above

Get PayClient: Common.get(key)
```javascript
let PayClient = Common.get('PayClient');

// PayClient.request(appId, method, resource, postBody, callback)
PayClient.request(0, 'GET', '/transaction/1', null, function(error, result) {
  if (error) {
    callback(error);
  } else {
    console.log(result);
  }
});
```

Get ApiClient: Common.get(key)
```javascript
let ApiClient = Common.get('ApiClient');

// See classy-node for details
ApiClient.app().then(() => {
  ApiClient.organizations.retrieve(1, {
    token: 'app'
  }).then((result) => {
    console.log(result);
  });
});
```

Get Replacer: Common.get(key)
```javascript
let Replacer = Common.get('Replacer').replacer;
console.log(JSON.stringify({
  cvv: '123'
}, replacer, 2));
```
