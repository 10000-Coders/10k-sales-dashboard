// tokenManager.js
let dynamicHeader = {
  token: '',
  anotherValue: '',
};

export const setDynamicHeader = (token, anotherValue) => {
  dynamicHeader = {
    token,
    anotherValue,
  };
};

export const getDynamicHeader = () => {
  return dynamicHeader;
};
