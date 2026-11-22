import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Request interceptor: Attach JWT token from localStorage if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('farming_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Extract Section 10 standard error
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data;
    const standardError = {
      status: error.response?.status || 500,
      code: errorData?.code || 'NETWORK_ERROR',
      message: errorData?.message || error.message || 'Không thể kết nối đến máy chủ Backend',
      timestamp: errorData?.timestamp || new Date().toISOString(),
      path: errorData?.path || ''
    };
    return Promise.reject(standardError);
  }
);

export default api;
