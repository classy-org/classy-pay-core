// tslint:disable:max-classes-per-file
import { OAuth2 } from 'oauth';
import * as Logger from 'bunyan';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

import { normalizeUrl, JSONParseBig, requestWithLogs } from './utils/utils';

export type MethodType = 'GET' | 'POST' | 'PUT' | 'DELETE';

export class RequestResponseError extends Error {
  public response: AxiosResponse;

  constructor(response: AxiosResponse, message: string) {
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

  constructor(
    clientId: string,
    clientSecret: string,
    oauthUrl: string,
    apiUrl: string,
    config: { timeout?: number; log?: Logger } = {}
  ) {
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
        '/oauth2/auth'
      );
      oauth2.getOAuthAccessToken('', authParams, (err, accessToken) => {
        if (err) {
          reject(err);
        } else {
          resolve(<string>accessToken);
        }
      });
    });
  }

  private async makeRequest(
    bearer: string,
    method: MethodType,
    resource: string,
    payload?: object,
    useAPIUrl = true
  ) {
    const options: AxiosRequestConfig = {
      url: useAPIUrl ? normalizeUrl(`${this.apiUrl}${resource}`) : resource,
      timeout: this.timeout,
      method,
      headers: {
        Authorization: `Bearer ${bearer}`,
        'User-Agent': 'ClassyPay Node.JS',
      },
    };

    if (payload) {
      if (method !== 'POST' && method !== 'PUT') {
        throw new Error('Not allowed to perform a GET or DELETE request with a payload');
      }
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
      };
      options.data = payload;
    }

    const response = await requestWithLogs(options, this.log);
    if (response.status < 200 || response.status > 299) {
      throw new RequestResponseError(
        response,
        `API client received status code ${response.status}: ${response.data}`
      );
    } else {
      return {
        body: response.data ? JSONParseBig(JSON.stringify(response.data)) : undefined,
        nextPageUrl: response.headers.next_page_url,
      };
    }
  }

  public async request(
    method: MethodType,
    resource: string,
    payload?: object,
    authParams?: any,
    getAllPages = false
  ) {
    if (getAllPages && method !== 'GET') {
      throw new Error(`Can't pass getAllPages=true when using method type ${method}`);
    }
    const bearer = await this.getBearer(authParams);
    if (getAllPages) {
      let nextResource: string | undefined = normalizeUrl(`${this.apiUrl}${resource}`);
      let fullData: Array<any> | undefined;
      while (nextResource) {
        try {
          const results: {
            body: any;
            nextPageUrl: string | string[] | undefined;
          } = await this.makeRequest(bearer, method, nextResource, payload, false);
          const data = results.body.data;
          const nextPageUrl = results.nextPageUrl;
          if (data) {
            if (!fullData) {
              fullData = <Array<any>>data;
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
          if (axios.isAxiosError(e) && e.response?.status === 404 && fullData) {
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

  public async get(resource: string, authparams?: any) {
    return await this.request('GET', resource, undefined, authparams);
  }

  public async getAll(resource: string, authparams?: any) {
    return await this.request('GET', resource, undefined, authparams, true);
  }

  public async post(resource: string, payload?: object, authparams?: any) {
    return await this.request('POST', resource, payload, authparams);
  }

  public async put(resource: string, payload?: object, authparams?: any) {
    return await this.request('PUT', resource, payload, authparams);
  }

  public async del(resource: string, authparams?: any) {
    return await this.request('DELETE', resource, undefined, authparams);
  }
}
