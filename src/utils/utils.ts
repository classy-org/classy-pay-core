import * as Logger from 'bunyan';
import request = require('request');
import * as _ from 'lodash';
import req = require('request-promise');
import {StatusCodeError} from 'request-promise/errors';

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
  }
  catch (e) { }

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

export const stringToBoolean = (input: string|undefined, defaultValue: boolean = false): boolean => {
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

type RequestOptionsWithUri = request.UriOptions & req.RequestPromiseOptions;
type RequestOptionsWithUrl = request.UrlOptions & req.RequestPromiseOptions;
export type RequestOptions = RequestOptionsWithUri | RequestOptionsWithUrl;

export const omitDeepWithKeys = (obj: any, excludeKeys: Array<string>, replacementValue?: string) => {
  const stackSet = new Set();
  const newObj = _.cloneDeep<any>(obj);

  const omitFn = (value: any) => {
    if (!_.isObject(value) || _.isFunction(value) || stackSet.has(value)) {
      return;
    }

    excludeKeys.forEach(key => {
      if (replacementValue && value[key] !== undefined) {
        value[key] = replacementValue;
      } else {
        delete value[key];
      }
    });

    stackSet.add(value);
    for (const key of Object.keys(value)) {
      omitFn(value[key]);
    }
  };
  omitFn(newObj);
  return newObj;
};

export const redact = (obj: any) => omitDeepWithKeys(
  obj,
  ['Authorization',
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
    'source'],
  '*** REDACTED ***',
);

export const requestWithLogs = async (options: RequestOptions, log?: Logger): Promise<request.Response> => {
  let logString;
  if (log) {
    let location;
    if ('url' in options) {
      location = options.url;
    } else if ('uri' in options) {
      location = options.uri;
    }
    logString = `${options.method} ${location}`;

    log.info(redact({request: options}), `Request ${logString}`);
  }
  let response: undefined|request.Response;
  let error: undefined|Error;
  try {
    const retValue = await req(options);
    response = retValue;
    return retValue;
  } catch (e) {
    error = e;
    throw e;
  } finally {
    if (log) {
      let statusCode = response ? response.statusCode : undefined;
      if (!statusCode && error && 'statusCode' in error) {
        statusCode = (<StatusCodeError> error).statusCode ? (<StatusCodeError> error).statusCode : undefined;
      }
      if (statusCode === 200 && error === undefined) {
        const toRedactResponse = _.cloneDeep(response);
        if (toRedactResponse !== undefined && isJSONString(_.get(toRedactResponse, 'body'))) {
          toRedactResponse.body = JSON.parse(toRedactResponse.body);
        }
        log.info(redact({request: options, response: toRedactResponse}), `Response (Good) ${logString}`);
      } else {
        log.error(
          redact({request: options, response, error}),
          `Response (Bad${statusCode ? ' - ' + statusCode : ''}) ${logString}`,
        );
      }
    }
  }
};

type RecurseVisitorFunctionInputType = 'ROOT'|'ARRAY'|'OBJECT';
type RecurseVisitorAction = 'RECURSE_DEEPER'|'STOP';
type RecurseVisitorFunction = (
  type: RecurseVisitorFunctionInputType,
  value: any,
  keyOrIndex?: string|number,
  parent?: any,
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

const _recurseImpl = (parent: any, input: any, visitor: RecurseVisitorFunction, options?: RecurseOptions) => {
  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i++) {
      const action = visitor('ARRAY', input[i], i, input);
      if (action === 'RECURSE_DEEPER') {
        _recurseImpl(input, input[i], visitor, options);
      }
    }
  } else if (_.isObject(input) && !_.isFunction(input)) {
    const visitNonEnumerableNodes = options ? options.visitNonEnumerableNodes : false;
    for (const key of visitNonEnumerableNodes ? Object.getOwnPropertyNames(input) : Object.keys(input)) {
      const action = visitor('OBJECT', input[key], key, input);
      if (action === 'RECURSE_DEEPER') {
        _recurseImpl(input, input[key], visitor, options);
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
export const unpromisify = async (f: () => Promise<any>, callback: CallbackFunction): Promise<void> => {
  let result;
  let error;
  try {
    result = await f();
  } catch (e) {
    error = e;
  } finally {
    callback(error, result);
  }
};
