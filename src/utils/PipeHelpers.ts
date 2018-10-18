// tslint:disable no-console

import ParallelTransform = require('parallel-transform');
import stream = require('stream');
import {runAsyncCodeWithCallback} from './utils';

export const parallelTransform = (concurrency: number, handler: (data: any) => Promise<any>): stream.Transform =>
  new ParallelTransform(concurrency, {
  objectMode: true,
}, async (data, callback) => {
  runAsyncCodeWithCallback(async () => {
    return await handler(data);
  }, callback);
});

export const readableStream = (handler: () => Promise<any>): stream.Readable =>
  new stream.Readable({
    objectMode: true,
    async read() {
      let value;
      let error;
      try {
        value = await handler();
      } catch (e) {
        error = e;
        console.error(`Error reading from stream: ${error}`);
      }
      if (value) {
        this.push(value);
      }
    },
  });

export const writableStream = (handler: (data: any) => Promise<void>): stream.Writable =>
  new stream.Writable({
    objectMode: true,
    async write(chunk, encoding, callback) {
      runAsyncCodeWithCallback(async () => {
        await handler(chunk);
      }, callback);
    },
  });
