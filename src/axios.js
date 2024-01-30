// axios.js
import axios from 'axios';
const baseUrl = process.env.NEXT_PUBLIC_baseUrl;
import {getDynamicHeader} from './interceptManager';

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_baseUrl,
});

instance.interceptors.request.use(
  config => {
    const dynamicToken = getDynamicHeader();
    const {token} = dynamicToken;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

instance.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    return Promise.reject(error);
  },
);

export default instance;
