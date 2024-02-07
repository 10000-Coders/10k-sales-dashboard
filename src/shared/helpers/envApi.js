//  dev | uat | prod
const envType = 'dev';
let envConfig;

switch (envType) {
  case 'dev':
    envConfig = {
      interested_students: 'interested_students_dev',
      // base url will put here
    };
    break;
  case 'uat':
    envConfig = {
      interested_students: 'interested_students_uat',
    };
    break;
  case 'prod':
    envConfig = {
      interested_students: 'interested_students',
    };
    break;
  default:
    throw new Error(`Unsupported environment type: ${envType}`);
}

export {envConfig};
