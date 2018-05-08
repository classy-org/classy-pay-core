const Promise = require('bluebird');
const req = require('requestretry');
const _ = require('lodash');
const hmac256AuthSigner = require('./utils/hmac256AuthSigner');

const PAGE_LIMIT = 25;

class PayClient {
  constructor(apiUrl, token, secret, config = {}) {
    if (!apiUrl) throw new Error('PayClient requires apiUrl');
    if (!token) throw new Error('PayClient requires token');
    if (!secret) throw new Error('PayClient requires secret');

    this.apiUrl = apiUrl;
    this.config = config;

    this.sign = hmac256AuthSigner('CWS', token, secret);
  }

  /**
   * Get all the necessary headers for the request.
   *
   * @param {String} method the HTTP method for the request
   * @param {String} resource the resource being requested
   * @param {Object} payload  the body of the request
   *
   * @return {Object} the headers objects
   */
  getHeaders(method, resource, payload) {
    return {
      'Authorization': this.sign(
        method,
        resource,
        'application/json',
        payload ? JSON.stringify(payload) : null
      ),
      'User-Agent': 'ClassyPay Node.JS',
      'Content-Type': payload ? 'application/json' : undefined,
    };
  }

  /**
   * Get the request options.
   *
   * @param {Number} appId the pay application id
   * @param {String} method the http method
   * @param {String} resource the resource for the request
   * @param {Object} payload the body of the request
   * @param {Object} params the params provided by the caller
   *
   * @return {Object} the options for the request
   */
  getOptions(appId, method, resource, payload, params) {
    if (params && params['appId']) {
      throw new Error('Query parameters cannot contain appId');
    }

    return {
      method,
      url: `${this.apiUrl}${resource}`,
      qs:  _.extend({appId, meta: true}, params),
      body: payload ? JSON.stringify(payload) : null,
      timeout: this.config.timeout,
      headers: this.getHeaders(method, resource, payload),
    };
  }

  /**
   * A general Pay request.
   *
   * @param {Number} appId the pay application id
   * @param {String} method the http method
   * @param {String} resource the pay resource
   * @param {Object} payload the payload for the request
   * @param {Object} params the parameters for the request
   *
   * @return {Promise} result of the request, including parsed body if JSON
   */
  async request(appId, method, resource, payload = null, params = null) {
    if (!_.isString(appId)) {
      throw new Error('App ID must be provided as string to avoid losing precision');
    }
    if (!resource.match(/^\/[\/A-Za-z0-9]*$/)) {
      throw new Error(`Invalid resource: ${resource}`);
    }
    const response = await req(this.getOptions(appId, method, resource, payload, params));
    const status = _.get(response, 'statusCode');
    if (status != 200) {
      throw new Error(`Server returned error code ${status} from ${method} ${resource}: ${response.body}`);
    }
    return {
      status,
      response,
      body: response.body,
      object: (response.body &&
        response.headers['content-type'].includes('application/json')) ?
        JSON.parse(response.body) : response.body,
    };
  }

  /**
   * Get an object.
   *
   * @param {Number} appId the pay application id
   * @param {String} method the http method
   * @param {String} resource the pay resource
   * @param {Object} body the body of the request
   *
   * @return {Promise} object of the request
   */
  async forObject(appId, method, resource, body = null) {
    return (await this.request(appId, method, resource, body)).object;
  }

  /**
   * Get all objects.
   *
   * @param {Number} appId the pay application id
   * @param {String} resource the pay resource
   *
   * @return {Promise} objects of the request
   */
  async forList(appId, resource) {
    const max = (await this.request(appId, 'GET', `${resource}/count`)).object.count;
    const results = await Promise.map(_.range(0, max, PAGE_LIMIT),
      async page => (await this.request(appId, 'GET', resource, null, {
          limit: PAGE_LIMIT,
          offset: page,
        })).object, {
        concurrency: 10,
      });
    return _.flatten(results);
  }

  /**
   * Get a list of objects for a resource.
   *
   * @param {Number} appId the pay application id
   * @param {String} resource the pay resource
   *
   * @return {Array} an array of objects
   */
  async list(appId, resource) {
    return await this.forList(appId, resource);
  }

  /**
   * Get an object given a resource.
   *
   * @param {Number} appId the pay application id
   * @param {String} resource the pay resource
   *
   * @return {Object} an object
   */
  async get(appId, resource) {
    return await this.forObject(appId, 'GET', resource);
  }

  /**
   * Create an object at a resource.
   *
   * @param {Number} appId the pay application id
   * @param {String} resource the pay resource
   * @param {Object} object the object to create
   *
   * @return {Object} the created object
   */
  async post(appId, resource, object) {
    return await this.forObject(appId, 'POST', resource, object);
  }

  /**
   * Update an object at a resource.
   *
   * @param {Number} appId the pay application id
   * @param {String} resource the pay resource
   * @param {Object} object the updated object
   *
   * @return {Object} the updated object
   */
  async put(appId, resource, object) {
    return await this.forObject(appId, 'PUT', resource, object);
  }

  /**
   * Remove an object at a resource.
   *
   * @param {Number} appId the pay application id
   * @param {String} resource the pay resource
   *
   * @return {Object} the removed object
   */
  async del(appId, resource) {
    return await this.forObject(appId, 'DELETE', resource);
  }

  forAppId(appId) {
    if (!_.isString(appId)) {
      throw new Error('App ID must be provided as string to avoid losing precision');
    }

    return {
      list: resource => this.list(appId, resource),
      get: resource => this.get(appId, resource),
      post: (resource, object) => this.post(appId, resource, object),
      put: (resource, object) => this.put(appId, resource, object),
      del: resource => this.del(appId, resource)
    };
  }
}

module.exports = PayClient;
