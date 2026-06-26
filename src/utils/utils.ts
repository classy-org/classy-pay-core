import * as Logger from 'bunyan';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as _ from 'lodash';

export const safeStrConcat = (strings: Array<any>): string => {
  let output = '';
  for (const s of strings) {
    if (s !== null && s !== undefined) {
      output = output + s;
    }
  }
  return output;
};

export const isJSONString = (jsonString: string): boolean => {
  try {
    const o = JSON.parse(jsonString);

    if (o && typeof o === 'object') {
      return true;
    }
  } catch (e) {}

  return false;
};

export const normalizeUrl = (inputUrl: string): string => {
  const m = inputUrl.match(/^(https?:\/\/)([^:/?#]*)(:[0-9]+)?([^?#]*)?(\?[^?]+)?$/);
  if (m) {
    let path = '/';

    if (m[4]) {
      if (!m[4].startsWith('/')) {
        throw new Error(`Path part of URL didn't start with /`);
      }
      path = m[4].replace(/\/\/+/g, '/');
    }

    return safeStrConcat([
      m[1],
      m[2],
      m[3],
      path,
      m[5],
    ]);
  } else {
    throw new Error(`URL "${inputUrl}" didn't look like a URL and couldn't be normalized`);
  }
};

const jsonParse = require('json-bigint')({ storeAsString: true }).parse;

export const JSONParseBig = (json: string): any => require('json-bigint')({ storeAsString: true }).parse(json);

export const stringToBoolean = (input: string | undefined, defaultValue: boolean = false): boolean => {
  if (input) {
    if (_.toLower(input) === 'true') {
      return true;
    }
    const n = parseFloat(input);
    if (isFinite(n) && !isNaN(n) && n > 0) {
      return true;
    }

    return false;
  }
  return defaultValue;
};

type AxiosRequestOptions = AxiosRequestConfig;

type AxiosResponseWithBody<T = any> = AxiosResponse<T> & { body?: T };

// Walks the prototype chain to find a property's descriptor, since the
// property may be an accessor (getter/setter) defined on a prototype rather
// than an own property of the object.
const findPropertyDescriptor = (obj: object, key: string): PropertyDescriptor | undefined => {
  let current: any = obj;
  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) {
      return descriptor;
    }
    current = Object.getPrototypeOf(current);
  }
  return undefined;
};

export const omitDeepWithKeys = (obj: any, excludeKeys: Array<string>, replacementValue?: string) => {
  const stackSet = new Set();
  const newObj = _.cloneDeep<any>(obj);

  const omitFn = (value: any) => {
    if (!_.isObject(value) || _.isFunction(value) || stackSet.has(value)) {
      return;
    }

    const valueAsRecord = value as Record<string, any>;


    excludeKeys.forEach(key => {
      const descriptor = findPropertyDescriptor(valueAsRecord, key);
      if (replacementValue && valueAsRecord[key] !== undefined) {
        // Skip properties that can't be reassigned (e.g. getter-only accessors,
        // possibly inherited from a prototype, or otherwise non-writable).
        if (descriptor && !descriptor.writable && !descriptor.set) {
          return;
        }
        valueAsRecord[key] = replacementValue;
      } else {
        // Skip properties that can't be deleted (non-configurable). Inherited
        // properties have no own descriptor here, so delete is a safe no-op.
        if (descriptor && !descriptor.configurable && Object.prototype.hasOwnProperty.call(valueAsRecord, key)) {
          return;
        }
        delete valueAsRecord[key];
      }
    });

    stackSet.add(valueAsRecord);
    for (const key of Object.keys(valueAsRecord)) {
      omitFn(valueAsRecord[key]);
    }
  };
  omitFn(newObj);
  return newObj;
};

export const redact = (obj: any) =>
  omitDeepWithKeys(
    obj,
    [
      'Authorization',
      'accountNumber',
      'address1',
      'address2',
      'address3',
      'address4',
      'city',
      'email',
      'token',
      'province',
      'routingNumber',
      'state',
      'zip',
      'processorDetails',
      'source',
    ],
    '*** REDACTED ***'
  );

// If `data` is a serialized JSON string (as axios stores request bodies on
// `config.data`), parse it back into an object so the key-based `redact()` can
// reach the PII inside it. Otherwise key-based redaction is blind to it.
const parseIfJSONString = (data: any): any =>
  typeof data === 'string' && isJSONString(data) ? JSON.parse(data) : data;

// Projects an axios response down to only the fields that are safe and useful
// to log. The raw response object carries the Node http.ClientRequest (open
// sockets, TLS session keys, the raw `Authorization: Bearer ...` header string)
// and `config.data` (the request body as an unredactable serialized string) —
// none of which `redact()` can scrub. We drop `config` and `request` entirely.
const toSafeLogResponse = (response?: AxiosResponseWithBody) => {
  if (!response) {
    return response;
  }
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: parseIfJSONString(response.data),
  };
};

// Projects an error down to a safe shape. For an AxiosError this strips the
// embedded `config`/`request` (which leak the same way as above) and keeps only
// the message, code, stack, and a sanitized response.
const toSafeLogError = (error?: Error) => {
  if (!error) {
    return error;
  }
  if (axios.isAxiosError(error)) {
    return {
      message: error.message,
      code: error.code,
      stack: error.stack,
      response: toSafeLogResponse(error.response as AxiosResponseWithBody),
    };
  }
  return { message: error.message, stack: error.stack };
};

export const requestWithLogs = async (
  options: AxiosRequestOptions,
  log?: Logger
): Promise<AxiosResponseWithBody> => {
  let logString;
  if (log) {
    const location = options.url;
    logString = `${options.method?.toUpperCase()} ${location}`;

    log.info(redact({ request: options }), `Request ${logString}`);
  }
  let response: undefined | AxiosResponseWithBody;
  let error: undefined | Error;
  try {
    const retValue = await axios(options);
    response = retValue;
    return retValue;
  } catch (e) {
    if (e instanceof Error) {
      error = e;
      throw e;
    } else {
      error = new Error('An unknown error occurred');
      throw error;
    }
  } finally {
    if (log) {
      let statusCode = response ? response.status : undefined;
      if (!statusCode && error && axios.isAxiosError(error) && error.response) {
        statusCode = error.response.status;
      }
      if (statusCode === 200 && error === undefined) {
        log.info(
          redact({ request: options, response: toSafeLogResponse(response) }),
          `Response (Good) ${logString}`
        );
      } else {
        log.error(
          redact({
            request: options,
            response: toSafeLogResponse(response),
            error: toSafeLogError(error),
          }),
          `Response (Bad${statusCode ? ' - ' + statusCode : ''}) ${logString}`
        );
      }
    }
  }
};

type RecurseVisitorFunctionInputType = 'ROOT' | 'ARRAY' | 'OBJECT';
type RecurseVisitorAction = 'RECURSE_DEEPER' | 'STOP';
type RecurseVisitorFunction = (
  type: RecurseVisitorFunctionInputType,
  value: any,
  keyOrIndex?: string | number,
  parent?: any
) => RecurseVisitorAction;
interface RecurseOptions {
  visitNonEnumerableNodes?: boolean;
}

export const recurse = (input: any, visitor: RecurseVisitorFunction, options?: RecurseOptions) => {
  if (input) {
    const action = visitor('ROOT', input);
    if (action === 'RECURSE_DEEPER') {
      _recurseImpl(undefined, input, visitor, options);
    }
  }
};

const _recurseImpl = (
  parent: any,
  input: any,
  visitor: RecurseVisitorFunction,
  options?: RecurseOptions
) => {
  if (Array.isArray(input)) {
    const inputArray = input as [key: any];
    for (let i = 0; i < inputArray.length; i++) {
      const action = visitor('ARRAY', inputArray[i], i, inputArray);
      if (action === 'RECURSE_DEEPER') {
        _recurseImpl(inputArray, inputArray[i], visitor, options);
      }
    }
  } else if (_.isObject(input) && !_.isFunction(input)) {
    const inputObject = input as Record<string, any>;

    const visitNonEnumerableNodes = options ? options.visitNonEnumerableNodes : false;
    for (const key of visitNonEnumerableNodes ? Object.getOwnPropertyNames(inputObject) : Object.keys(input)) {
      const action = visitor('OBJECT', inputObject[key], key, inputObject);
      if (action === 'RECURSE_DEEPER') {
        _recurseImpl(inputObject, inputObject[key], visitor, options);
      }
    }
  }
};

export const sequelizeCloneDeep = (input: any): any => {
  const clonedNodes = new Map<any, any>();
  let clonedRootNode: any;

  recurse(input, (type, value, keyOrIndex, parent): RecurseVisitorAction => {
    let clonedValue: any;
    let retval: RecurseVisitorAction = 'RECURSE_DEEPER';
    if (value === undefined || value === null) {
      clonedValue = value;
    } else if (keyOrIndex === 'prototype') {
      return 'STOP'; // prevent prototype pollution
    } else if (clonedNodes.get(value)) {
      clonedValue = clonedNodes.get(value);
      retval = 'STOP';
    } else if (value.toJSON) {
      clonedValue = value.toJSON();
      clonedNodes.set(value, clonedValue);
      retval = 'STOP';
    } else {
      clonedValue = _.clone(value);
      clonedNodes.set(value, clonedValue);
    }

    let clonedParent;
    if (type === 'ROOT') {
      clonedNodes.set(value, clonedValue);
      clonedRootNode = clonedValue;
    } else {
      clonedParent = clonedNodes.get(parent);
      if (!clonedParent) {
        throw new Error(`Couldn't find cloned parent while recursing`);
      }
      clonedParent[keyOrIndex ? keyOrIndex : 0] = clonedValue;
    }

    return retval;
  });

  return clonedRootNode;
};

export const runFunctionAfterDelay = (ms: number, func: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await func();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    }, ms);
  });
};

export type CallbackFunction = (error: Error, value: any) => void;
export const unpromisify = async (
  f: () => Promise<any>,
  callback: CallbackFunction
): Promise<void> => {
  let result;
  let error;
  try {
    result = await f();
  } catch (e) {
    error = e;
  } finally {
    if (error instanceof Error) {
      callback(error, result);
    } else {
      callback(new Error('An unknown error occurred'), result);
    }
  }
};
