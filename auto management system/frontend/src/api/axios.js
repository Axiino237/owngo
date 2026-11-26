import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000 // ✅ 30s timeout — fail fast instead of hanging forever
});

// Attach token to every request and prevent duplicate /api prefixes
api.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('/api/')) {
    config.url = config.url.replace(/^\/api/, '');
  }
  const token = localStorage.getItem('crm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // ✅ If sending FormData, remove the hardcoded application/json Content-Type
  // so axios can automatically set multipart/form-data with the correct boundary.
  // Also remove 30s timeout for file uploads so large (up to 2GB) transfers complete smoothly.
  if (config.data instanceof FormData) {
    if (config.headers) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
        config.headers.delete('content-type');
      } else {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }
    if (!config.timeout || config.timeout === 30000) {
      config.timeout = 0; // Unlimited timeout for file uploads
    }
  }

  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') ||
                           url.includes('/auth/forgot-password') ||
                           url.includes('/auth/verify-otp') ||
                           url.includes('/auth/reset-password') ||
                           url.includes('/notifications/');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      localStorage.removeItem('crm_saved_credentials');

      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        // Never trigger redirect or reload if already on the login page!
        if (currentPath !== '/login') {
          const search = window.location.search;
          const fullPath = currentPath + search;
          const redirectParam = fullPath && fullPath !== '/' ? `?redirect=${encodeURIComponent(fullPath)}` : '';
          window.location.href = `/login${redirectParam}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
