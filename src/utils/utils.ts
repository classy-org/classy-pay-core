import _ = require('lodash');

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
