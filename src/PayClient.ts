import {UriOptions, UrlOptions} from 'request';
import { Promise } from 'bluebird';
import * as _ from 'lodash';
import * as Logger from 'bunyan';

import { CreateHMACSigner, HMACSigner } from './utils/hmac256AuthSigner';
import {RequestOptions, requestWithLogs} from './utils/utils';

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
  get: (resource: string) => Promise<string|object>;
  post: (resource: string, object: object) => Promise<string|object>;
  put: (resource: string, object: object) => Promise<string|object>;
  del: (resource: string) => Promise<string|object>;
}

export class PayClient {
  private readonly apiUrl: string;
  private readonly config: { timeout?: number};
  private readonly sign: HMACSigner;
  private readonly log?: Logger;
  private readonly version?: string;

  constructor(
    apiUrl: string,
    token: string,
    secret: string,
    config: { timeout?: number, log?: Logger, version?: string } = {}) {
    if (!apiUrl) throw new Error('PayClient requires apiUrl');
    if (!token) throw new Error('PayClient requires token');
    if (!secret) throw new Error('PayClient requires secret');

    this.apiUrl = apiUrl;
    this.config = config;
    this.log = config.log;
    this.version = config.version;

    this.sign = CreateHMACSigner('CWS', token, secret);
  }

  private getHeaders(method: string, resource: string, payload?: object): object {
    const headers: any = {
      'Authorization': this.sign(
        method,
        resource,
        'application/json',
        payload ? JSON.stringify(payload) : undefined,
      ),
      'User-Agent': 'ClassyPay Node.JS',
      'Content-Type': payload ? 'application/json' : undefined,
    };
    if (this.version) {
      headers['x-classypay-version'] = this.version;
    }
    return headers;
  }

  private getOptions(
    appId: string,
    method: string,
    resource: string,
    payload?: object,
    params?: object)
    : RequestOptions {
    return {
      method,
      url: `${this.apiUrl}${resource}`,
      qs:  _.extend({appId, meta: true}, params),
      body: payload ? JSON.stringify(payload) : undefined,
      timeout: this.config.timeout,
      headers: this.getHeaders(method, resource, payload),
      resolveWithFullResponse: true,
    };
  }

  private async request(
    appId: string,
    method: string,
    resource: string,
    payload?: object,
    params?: object)
    : Promise<RequestResponse> {
    if (!_.isString(appId)) {
      throw new Error('App ID must be provided as string to avoid losing precision');
    }
    if (!resource.match(/^\/[\/A-Za-z0-9\\-_]*$/)) {
      throw new Error(`Invalid resource: ${resource}`);
    }
    const options = this.getOptions(appId, method, resource, payload, params);

    const response = await requestWithLogs(options, this.log);
    const status = response.statusCode;
    if (status !== 200) {
      throw new Error(`Server returned error code ${status} from ${method} ${resource}: ${response && response.body}`);
    }

    return {
      status,
      object: (response.body && response.headers && response.headers['content-type'] &&
        _.includes(response.headers['content-type'], 'application/json')) ?
        JSON.parse(response.body)
        : _.get(response, 'body'),
    };
  }

  private async forObject(appId: string, method: string, resource: string, body?: object): Promise<object|string> {
    return (await this.request(appId, method, resource, body)).object;
  }

  private async forList(appId: string, resource: string): Promise<Array<object>> {
    const responseObj = (await this.request(appId, 'GET', `${resource}/count`)).object;
    if (typeof responseObj === 'string') {
      throw new Error(`Expected server response with count, instead got: ${responseObj}`);
    } else {
      const max = responseObj.count;
      const results = await Promise.map(_.range(0, max, PAGE_LIMIT),
        async page => {
          const innerResponse = await this.request(
            appId,
            'GET',
            resource,
            undefined,
            {limit: PAGE_LIMIT, offset: page},
          );
          if (innerResponse.status !== 200 || typeof innerResponse.object === 'string') {
            throw new Error(`Expected server response with object, instead got: ${innerResponse}`);
          } else {
            return innerResponse.object;
          }
        }, {
          concurrency: 10,
        });
      return _.flatten(results);
    }
  }

  /**
   * Get a list of objects for a resource.
   *
   * @param {String} appId the pay application id
   * @param {String} resource the pay resource
   *
   * @return {Array} an array of objects
   */
  public async list(appId: string, resource: string): Promise<Array<object>> {
    return await this.forList(appId, resource);
  }

  /**
   * Get an object given a resource.
   *
   * @param {String} appId the pay application id
   * @param {String} resource the pay resource
   *
   * @return {Object} an object
   */
  public async get(appId: string, resource: string): Promise<string|object> {
    return await this.forObject(appId, 'GET', resource);
  }

  /**
   * Create an object at a resource.
   *
   * @param {String} appId the pay application id
   * @param {String} resource the pay resource
   * @param {Object} object the object to create
   *
   * @return {Object} the created object
   */
  public async post(appId: string, resource: string, object: object): Promise<string|object> {
    return await this.forObject(appId, 'POST', resource, object);
  }

  /**
   * Update an object at a resource.
   *
   * @param {String} appId the pay application id
   * @param {String} resource the pay resource
   * @param {Object} object the updated object
   *
   * @return {Object} the updated object
   */
  public async put(appId: string, resource: string, object: object): Promise<string|object> {
    return await this.forObject(appId, 'PUT', resource, object);
  }

  /**
   * Remove an object at a resource.
   *
   * @param {String} appId the pay application id
   * @param {String} resource the pay resource
   *
   * @return {Object} the removed object
   */
  public async del(appId: string, resource: string): Promise<string|object> {
    return await this.forObject(appId, 'DELETE', resource);
  }

  /**
   * Generate an appId-specific pay client
   *
   * @param {String} appId app ID
   * @returns {Object} Pay Client
   */
  public forAppId(appId: string): AppSpecificPayClient {
    if (!_.isString(appId)) {
      throw new Error('App ID must be provided as string to avoid losing precision');
    }

    return {
      list: resource => this.list(appId, resource),
      get: resource => this.get(appId, resource),
      post: (resource, object) => this.post(appId, resource, object),
      put: (resource, object) => this.put(appId, resource, object),
      del: resource => this.del(appId, resource),
    };
  }
}

export default PayClient;
