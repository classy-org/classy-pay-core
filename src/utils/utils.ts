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
  ['Authorization'],
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

    log.info(redact(options), `Request ${logString}`);
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
        log.info(redact({request, response}), `Response (Good) ${logString}`);
      } else {
        log.error(
          redact({request, response, error}),
          `Response (Bad${statusCode ? ' - ' + statusCode : ''}) ${logString}`,
        );
      }
    }
  }
};
