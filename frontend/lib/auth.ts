import Cookies from 'js-cookie';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const setToken = (token: string) => {
  Cookies.set('token', token, { expires: 1 }); // 1 day
};

export const getToken = () => {
  return Cookies.get('token');
};

export const removeToken = () => {
  Cookies.remove('token');
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
