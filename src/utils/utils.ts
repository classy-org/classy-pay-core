import * as Logger from 'bunyan';
import request = require('request');
import * as _ from 'lodash';
import req = require('request-promise');

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
  if (log) {
    log.info(redactedOptions, 'Issued HTTP request');
  }
  let response: undefined|request.Response;
  try {
    return response = await req(options);
  } finally {
    if (log) {
      if (_.get(response, 'statusCode') === 200) {
        log.info({request: redactedOptions, response}, 'Received good response from request');
      } else {
        log.error({request: redactedOptions, response}, 'Received bad response from request');
      }
    }
  }
};
