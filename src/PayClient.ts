import { Promise } from 'bluebird';
import * as _ from 'lodash';
import * as Logger from 'bunyan';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

import { CreateHMACSigner, HMACSigner } from './utils/hmac256AuthSigner';
import { requestWithLogs } from './utils/utils';

require('source-map-support').install();

const PAGE_LIMIT = 25;

interface PayResponse {
  count?: number;
}

interface RequestResponse {
  status: number;
  object: PayResponse | string;
}

export interface AppSpecificPayClient {
  list: (resource: string) => Promise<Array<object>>;
  get: (resource: string, params?: object) => Promise<string | object>;
  post: (resource: string, object: object, params?: object) => Promise<string | object>;
  put: (resource: string, object: object, params?: object) => Promise<string | object>;
  del: (resource: string, params?: object) => Promise<string | object>;
}

export class PayClient {
  private readonly apiUrl: string;
  private readonly config: { timeout?: number };
  private readonly sign: HMACSigner;
  private readonly log?: Logger;
  private readonly version?: string;

  constructor(
    apiUrl: string,
    token: string,
    secret: string,
    config: { timeout?: number; log?: Logger; version?: string } = {}
  ) {
    if (!apiUrl) throw new Error('PayClient requires apiUrl');
    if (!token) throw new Error('PayClient requires token');
    if (!secret) throw new Error('PayClient requires secret');

    this.apiUrl = apiUrl;
    this.config = config;
    this.log = config.log;
    this.version = config.version;

    this.sign = CreateHMACSigner('CWS', token, secret);
  }

  private getHeaders(method: string, resource: string, payload?: object, idempotencyKey?: string): object {
    const headers: any = {
      Authorization: this.sign(
        method,
        resource,
        'application/json',
        payload ? JSON.stringify(payload) : undefined
      ),
      'User-Agent': 'ClassyPay Node.JS',
      'Content-Type': payload ? 'application/json' : undefined,
    };
    if (this.version) {
      headers['x-classypay-version'] = this.version;
    }
    if (idempotencyKey) {
      headers['x-classypay-idempotency-key'] = idempotencyKey;
    }
    return headers;
  }

  private getOptions(
    appId: string,
    method: string,
    resource: string,
    payload?: object,
    params?: object,
    idempotencyKey?: string
  ): AxiosRequestConfig {
    return {
      method,
      url: `${this.apiUrl}${resource}`,
      params: _.extend({ appId, meta: true }, params),
      data: payload,
      timeout: this.config.timeout,
      headers: this.getHeaders(method, resource, payload, idempotencyKey),
    };
  }

  private async request(
    appId: string,
    method: string,
    resource: string,
    payload?: object,
    params?: object,
    idempotencyKey?: string
  ): Promise<RequestResponse> {
    if (!_.isString(appId)) {
      throw new Error('App ID must be provided as string to avoid losing precision');
    }
    if (!resource.match(/^\/[\/A-Za-z0-9_\-]*$/)) {
      throw new Error(`Invalid resource: ${resource}`);
    }
    const options = this.getOptions(appId, method, resource, payload, params, idempotencyKey);
    // tslint:disable-next-line:no-console
    const response: AxiosResponse = await requestWithLogs(options, this.log);

    if (response.status < 200 || response.status > 299) {
      throw new Error(
        `Server returned error code ${response.status} from ${method} ${resource}: ${response.data}`
      );
    }

    return {
      status: response.status,
      object: response.data,
    };
  }

  private async forObject(
    appId: string,
    method: string,
    resource: string,
    body?: object,
    params?: object,
    idempotencyKey?: string
  ): Promise<object | string> {
    return (await this.request(appId, method, resource, body, params, idempotencyKey)).object;
  }

  private async forList(appId: string, resource: string): Promise<Array<object>> {
    const responseObj = (await this.request(appId, 'GET', `${resource}/count`)).object;
    if (typeof responseObj === 'string') {
      throw new Error(`Expected server response with count, instead got: ${responseObj}`);
    } else {
      const max = responseObj.count;
      const results = await Promise.map(
        _.range(0, max, PAGE_LIMIT),
        async page => {
          const innerResponse = await this.request(appId, 'GET', resource, undefined, {
            limit: PAGE_LIMIT,
            offset: page,
          });
          if (innerResponse.status < 200 || innerResponse.status > 299 || typeof innerResponse.object === 'string') {
            throw new Error(
              `Expected server response with object, instead got: ${innerResponse}`
            );
          } else {
            return innerResponse.object as object[];
          }
        },
        {
          concurrency: 10,
        }
      );
      return _.flatten(results);
    }
  }

  public async list(appId: string, resource: string): Promise<Array<object>> {
    return await this.forList(appId, resource);
  }

  public async get(appId: string, resource: string, params?: object): Promise<string | object> {
    return await this.forObject(appId, 'GET', resource, undefined, params);
  }

  public async post(
    appId: string,
    resource: string,
    object: object,
    params?: object,
    idempotencyKey?: string
  ): Promise<string | object> {
    return await this.forObject(appId, 'POST', resource, object, params, idempotencyKey);
  }

  public async put(
    appId: string,
    resource: string,
    object: object,
    params?: object,
    idempotencyKey?: string
  ): Promise<string | object> {
    return await this.forObject(appId, 'PUT', resource, object, params, idempotencyKey);
  }

  public async del(appId: string, resource: string, params?: object): Promise<string | object> {
    return await this.forObject(appId, 'DELETE', resource, undefined, params);
  }

  public forAppId(appId: string): AppSpecificPayClient {
    if (!_.isString(appId)) {
      throw new Error('App ID must be provided as string to avoid losing precision');
    }

    return {
      list:resource => this.list(appId, resource),
      get: (resource, params) => this.get(appId, resource, params),
      post: (resource, object, params) => this.post(appId, resource, object, params),
      put: (resource, object, params) => this.put(appId, resource, object, params),
      del: (resource, params) => this.del(appId, resource, params),
    };
  }
}

export default PayClient;
