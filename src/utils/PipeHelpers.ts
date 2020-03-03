// tslint:disable no-console

import ParallelTransform = require('parallel-transform');
import stream = require('stream');

import { unpromisify } from './utils';

export const parallelTransform = (concurrency: number, handler: (data: any) => Promise<any>): stream.Transform =>
  new ParallelTransform(concurrency, {
  objectMode: true,
}, async (data, callback) => {
  unpromisify(async () => await handler(data), callback);
});

export const readableStream = (handler: () => Promise<any>): stream.Readable =>
  new stream.Readable({
    objectMode: true,
    async read() {
      let value;
      try {
        value = await handler();
      } catch (error) {
        console.error(`Error reading from stream: ${error}`);
      }
      if (value) {
        this.push(value);
      } else {
        this.destroy();
      }
    },
  });

export const writableStream = (handler: (data: any) => Promise<void>): stream.Writable =>
  new stream.Writable({
    objectMode: true,
    async write(chunk, encoding, callback) {
      unpromisify(async () => {
        await handler(chunk);
      }, callback);
    },
  });
