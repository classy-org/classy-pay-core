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

type RequestOptionsWithUri = request.UriOptions & req.RequestPromiseOptions;
type RequestOptionsWithUrl = request.UrlOptions & req.RequestPromiseOptions;
export type RequestOptions = RequestOptionsWithUri | RequestOptionsWithUrl;

const redactRequest = (obj: RequestOptions) => {
  const retObj = _.cloneDeep<RequestOptions>(obj);

  if (retObj.headers && retObj.headers.Authorization) {
    retObj.headers.Authorization = '*** REDACTED ***';
  }

  return retObj;
};

export const requestWithLogs = async (options: RequestOptions, log?: Logger): Promise<request.Response> => {
  const redactedOptions = redactRequest(options);

  let logString;
  if (log) {
    let location;
    if ('url' in options) {
      location = options.url;
    } else if ('uri' in options) {
      location = options.uri;
    }
    logString = `${redactedOptions.method} ${location}`;

    log.info(redactedOptions, `Request ${logString}`);
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
        log.info({request: redactedOptions, response}, `Response (Good) ${logString}`);
      } else {
        log.error(
          {request: redactedOptions, response, error},
          `Response (Bad${statusCode ? ' - ' + statusCode : ''}) ${logString}`,
        );
      }
    }
  }
};
