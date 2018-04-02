const dir = process.env.LAMBDA_TASK_ROOT || process.env.PWD;
const environments = require(`${dir}/environment.json`);
const stage = process.env.AWS_LAMBDA_FUNCTION_NAME ? process.env.AWS_LAMBDA_FUNCTION_NAME.split('-')[2] : 'dev';
const environment = environments[stage];

const LambdaContext = {
  dir,
  stage,
  environment
};
module.exports = LambdaContext;
