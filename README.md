# Introduction

The classy-pay-core NPM module contains a set of reusable common tools used in ClassyPay-related projects.  There are a few pieces of functionality included, most notably:

- A plugin-based, lazily loaded configuration "dictionary" (implemented by the ```Config``` class).  The intent here is to be able to provide a bunch of different running node applications with a common set of lazily-populated global state, e.g. configuration that's shared between applications.  A sample implementation (```aws/AWSConfig```) and set of plugins (inside ```DataSources/```) is included as well (though probably minimally useful to anyone outside of Classy).

- A client that can be used to authenticate with / converse with the ClassyPay APIs (```PayClient```).

- A set of general purpose utilities:

    - ```Lock```: a simple mutex
    - ```Once```: a JavaScript implementation of ```pthread_once```
    - ```callbackWrapper```: code which allows you to perform promise-based operations (or async/await-based) from within a callback
    - Some other random utilities

# Usage

To load parts of the module, first load classy-pay-core as a whole, and then call ```submodule``` on the default export, like so:

```json
const Once = require('classy-pay-core').submodule('utils/Once');
```
