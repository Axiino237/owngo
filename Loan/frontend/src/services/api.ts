import axios from 'axios';

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'https:') {
      return '';
    }
    return `http://${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
};

const API_BASE = getApiBase();

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  login: async (email: string, pass: string) => {
    const res = await apiClient.post('/api/auth/login', { email, password: pass });
    return res.data;
  },
  getAdmins: async () => {
    const res = await apiClient.get('/api/auth/admins');
    return res.data;
  },
};

export const applicationsApi = {
  create: async (formData: any) => {
    const res = await apiClient.post('/api/applications', formData);
    return res.data;
  },
  getAll: async (status?: string) => {
    const params = status ? { status } : {};
    const res = await apiClient.get('/api/applications', { params });
    return res.data;
  },
  getCounts: async () => {
    const res = await apiClient.get('/api/applications/counts');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await apiClient.get(`/api/applications/${id}`);
    return res.data;
  },
  startReview: async (id: string, adminId: string, adminName: string) => {
    const res = await apiClient.post(`/api/applications/${id}/start-review`, {
      adminId,
      adminName,
    });
    return res.data;
  },
  releaseLock: async (id: string, adminId: string) => {
    const res = await apiClient.post(`/api/applications/${id}/release-lock`, {
      adminId,
    });
    return res.data;
  },
  saveEligibility: async (
    id: string,
    eligibility: 'YES' | 'NO',
    adminId: string,
    adminName: string,
  ) => {
    const res = await apiClient.patch(`/api/applications/${id}/eligibility`, {
      eligibility,
      adminId,
      adminName,
    });
    return res.data;
  },
};
