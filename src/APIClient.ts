import request = require('request-promise');
import { OAuth2 } from 'oauth';
import { normalizeUrl, JSONParseBig } from './utils/utils';

export type MethodType = 'GET'|'POST'|'PUT'|'DELETE';

export class APIClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly oauthUrl: string;
  private readonly apiUrl: string;
  private readonly timeout: number;

  /**
   * Builds an API client
   *
   * @param {string} clientId your client ID
   * @param {string} clientSecret your client secret (password)
   * @param {string} oauthUrl oauth URL
   * @param {string} apiUrl api URL
   * @param {number} timeout HTTP request timeout, or 120 minutes if unspecified
   */
  constructor(clientId: string, clientSecret: string, oauthUrl: string, apiUrl: string, timeout: number = 120000) {
    if (!clientId) throw Error('Cannot construct APIClient with null clientId');
    if (!clientSecret) throw Error('Cannot construct APIClient with null clientSecret');
    if (!oauthUrl) throw Error('Cannot construct APIClient with null oauthUrl');
    if (!apiUrl) throw Error('Cannot construct APIClient with null apiUrl');
    if (!timeout) throw Error('Cannot construct APIClient with null timeout');
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.oauthUrl = oauthUrl;
    this.apiUrl = apiUrl;
    this.timeout = timeout;
  }

  private async getBearer(authParams: any = { grant_type: 'client_credentials' }): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const oauth2 = new OAuth2(
        this.clientId,
        this.clientSecret,
        normalizeUrl(this.oauthUrl),
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

  private async makeRequest(bearer: string, method: MethodType, resource: string, payload?: object) {
    const options: any = {
      url: normalizeUrl(`${this.apiUrl}${resource}`),
      timeout: this.timeout,
      method,
      headers: {
        'Authorization': `Bearer ${bearer}`,
        'User-Agent': 'ClassyPay Node.JS',
      },
    };

    if (payload) {
      if (method !== 'POST' && method !== 'PUT') {
        throw new Error('Not allowed to perform a GET or DELETE request with a payload');
      }
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }

    const response = await request(options);
    if (response.statusCode !== 200) {
      throw new Error(`API client received status code ${response.statusCode}: ${response.body}`);
    } else {
      return response.body ? JSONParseBig(response.body) : undefined;
    }
  }

  /**
   * Perform a HTTP request against APIv2
   *
   * @param {MethodType} method the HTTP method: GET, POST, PUT, or DELETE
   * @param {MethodType} resource the resource you wish to operate on
   * @param {object} payload the payload, only applicable to POST and PUT requests
   * @param authParams
   * @returns {Promise<object | undefined>}
   */
  public async request(method: MethodType, resource: string, payload?: object, authParams?: any) {
    const bearer = await this.getBearer(authParams);
    return await this.makeRequest(bearer, method, resource, payload);
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
