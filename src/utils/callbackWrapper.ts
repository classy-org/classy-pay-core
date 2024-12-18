require('source-map-support').install();

type callback = (error?: Error, value?: any) => void;
type anonymousAsyncFunction = () => Promise<any|undefined>;

export const callbackWrapper = async (next: callback, f: anonymousAsyncFunction) => {
  let error;
  let value;
  try {
    value = await f();
  } catch (e) {
    error = e;
  } finally {
    next(error as Error, value);
  }
};

export default callbackWrapper;
