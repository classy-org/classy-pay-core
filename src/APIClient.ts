// tslint:disable:max-classes-per-file
import { OAuth2 } from 'oauth';
import * as Logger from 'bunyan';
import request = require('request');
import {URL} from 'url';

import { normalizeUrl, JSONParseBig, requestWithLogs } from './utils/utils';

export type MethodType = 'GET'|'POST'|'PUT'|'DELETE';

export class RequestResponseError extends Error {
  public response: request.Response;

  constructor(response: request.Response, message: string) {
    super(message);
    this.response = response;
  }
}

export class APIClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly oauthUrl: string;
  private readonly apiUrl: string;
  private readonly timeout: number;
  private readonly log?: Logger;

  /**
   * Builds an API client
   *
   * @param {string} clientId your client ID
   * @param {string} clientSecret your client secret (password)
   * @param {string} oauthUrl oauth URL
   * @param {string} apiUrl api URL
   * @param {number} timeout HTTP request timeout, or 120 minutes if unspecified
   */
  constructor(
    clientId: string,
    clientSecret: string,
    oauthUrl: string,
    apiUrl: string,
    config: { timeout?: number, log?: Logger } = {}) {
    if (!clientId) throw Error('Cannot construct APIClient with null clientId');
    if (!clientSecret) throw Error('Cannot construct APIClient with null clientSecret');
    if (!oauthUrl) throw Error('Cannot construct APIClient with null oauthUrl');
    if (!apiUrl) throw Error('Cannot construct APIClient with null apiUrl');
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.oauthUrl = oauthUrl;
    this.apiUrl = apiUrl;
    this.timeout = config.timeout ? config.timeout : 120000;
    this.log = config.log;
  }

  private async getBearer(authParams: any = { grant_type: 'client_credentials' }): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const oauth2 = new OAuth2(
        this.clientId,
        this.clientSecret,
        this.oauthUrl,
        undefined,
        '/oauth2/auth',
      );
      oauth2.getOAuthAccessToken('', authParams, (err, accessToken, refreshToken, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(accessToken);
        }
      });
    });
  }

  private async makeRequest(bearer: string, method: MethodType, resource: string, payload?: object, useAPIUrl = true) {
    const options: any = {
      url: useAPIUrl ? normalizeUrl(`${this.apiUrl}${resource}`) : resource,
      timeout: this.timeout,
      method,
      headers: {
        'Authorization': `Bearer ${bearer}`,
        'User-Agent': 'ClassyPay Node.JS',
      },
      resolveWithFullResponse: true,
    };

    if (payload) {
      if (method !== 'POST' && method !== 'PUT') {
        throw new Error('Not allowed to perform a GET or DELETE request with a payload');
      }
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }

    const response = await requestWithLogs(options, this.log);
    if (response.statusCode < 200 || response.statusCode > 299) {
      throw new RequestResponseError(
        response,
        `API client received status code ${response.statusCode}: ${response.body}`,
      );
    } else {
      // tslint:disable-next-line:no-string-literal
      return {
        body: response.body ? JSONParseBig(response.body) : undefined,
        // tslint:disable-next-line:no-string-literal
        nextPageUrl: response.headers['next_page_url'],
      };
    }
  }

  /**
   * Perform a HTTP request against APIv2
   *
   * @param {MethodType} method the HTTP method: GET, POST, PUT, or DELETE
   * @param {MethodType} resource the resource you wish to operate on
   * @param {object} payload the payload, only applicable to POST and PUT requests
   * @param authParams
   * @param getAllPages concatenate all pages for GET requests
   * @returns {Promise<object | undefined>}
   */
  public async request(method: MethodType, resource: string, payload?: object, authParams?: any, getAllPages = false) {
    if (getAllPages && method !== 'GET') {
      throw new Error(`Can't pass getAllPages=true when using method type ${method}`);
    }
    const bearer = await this.getBearer(authParams);
    if (getAllPages) {
      let nextResource: string|undefined = normalizeUrl(`${this.apiUrl}${resource}`);
      let fullData: Array<any>|undefined;
      while (nextResource) {
        try {
          const results: {
            body: any,
            nextPageUrl: string|string[]|undefined,
          } = await this.makeRequest(bearer, method, nextResource, payload, false);
          const data = results.body.data;
          const nextPageUrl = results.nextPageUrl;
          if (data) {
            if (!fullData) {
              fullData = <Array<any>> data;
            } else {
              fullData = fullData.concat(data);
            }
          }
          if (nextPageUrl) {
            nextResource = typeof nextPageUrl === 'string' ? nextPageUrl : nextPageUrl[0];
          } else {
            nextResource = undefined;
          }
        } catch (e) {
          if (e instanceof RequestResponseError && e.response.statusCode === 404 && fullData) {
              nextResource = undefined;
          } else {
            throw e;
          }
        }
      }
      return fullData;
    } else {
      return (await this.makeRequest(bearer, method, resource, payload)).body;
    }
  }

  /**
   * Convenience wrapper around request, to perform a GET.
   *
   * @param {string} resource
   * @param authparams
   * @returns {Promise<object | undefined>}
   */
  public async get(resource: string, authparams?: any) {
    return await this.request('GET', resource, undefined, authparams);
  }

  /**
   * Convenience wrapper around request, to perform a GET returning all pages.
   *
   * @param {string} resource
   * @param authparams
   * @returns {Promise<object | undefined>}
   */
  public async getAll(resource: string, authparams?: any) {
    return await this.request('GET', resource, undefined, authparams, true);
  }

  /**
   * Convenience wrapper around request, to perform a POST.
   *
   * @param {string} resource
   * @param authparams
   * @returns {Promise<object | undefined>}
   */
  public async post(resource: string, payload?: object, authparams?: any) {
    return await this.request('POST', resource, payload, authparams);
  }

  /**
   * Convenience wrapper around request, to perform a PUT.
   *
   * @param {string} resource
   * @param authparams
   * @returns {Promise<object | undefined>}
   */
  public async put(resource: string, payload?: object, authparams?: any) {
    return await this.request('PUT', resource, payload, authparams);
  }

  /**
   * Convenience wrapper around request, to perform a DELETE.
   *
   * @param {string} resource
   * @param authparams
   * @returns {Promise<object | undefined>}
   */
  public async del(resource: string, authparams?: any) {
    return await this.request('DELETE', resource, undefined, authparams);
  }
}
