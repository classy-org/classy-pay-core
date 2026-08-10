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

# Log redaction

The `Logger` provided by `LoggingDataSource` (via `config.get('Logger')`) redacts sensitive values from every log record when the environment config contains a `security` section:

```yaml
security:
  obfuscate:        # keys to redact, anywhere in a log record, at any depth
    - accessToken
    - email
    - token
  replacement: '[HIDDEN]'   # censor value written in place of redacted values
```

The configured keys are merged with a built-in default list (`DEFAULT_REDACT_KEYS` in `utils/utils`), which covers common payment/PII keys such as `Authorization`, `accessToken`, `accountNumber`, `email`, `firstName`, `lastName`, `phone`, `cvv`, and `ssn`. Without a `security` section, the logger performs no redaction.

Redaction is key-based: values inside serialized JSON strings are not reachable. Parse such strings before logging them.

`requestWithLogs(options, log)` requires a logger; pass the `Logger` from `config.get('Logger')` so request/response logs inherit the configured redaction.
