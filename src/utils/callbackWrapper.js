'use strict';

module.exports = async (next, f) => {
  let error;
  let value;
  try {
    value = await f();
  } catch (e) {
    error = e;
  } finally {
    next(error, value);
  }
};
