import axios from 'axios';

const api = axios.create({
  baseURL: `http://${window.location.hostname}:8000`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// For mock purposes, we will mostly intercept and return dummy data,
// but let's keep the real instance ready as requested.
api.interceptors.request.use(
  (config) => {
    // We could add auth token here if needed
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Global error handling
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;
