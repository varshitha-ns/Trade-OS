import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (userData) => api.post('/api/auth/login', userData),
  uploadKYC: (userId, documentType, file) => {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('document_type', documentType);
    formData.append('file', file);
    return api.post('/api/auth/upload-kyc', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getStatus: (userId) => api.get(`/api/auth/status?user_id=${userId}`),
};

export const userAPI = {
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (profileData) => api.put('/api/users/profile', profileData),
};

export const marketplaceAPI = {
  getProducts: (params) => api.get('/api/marketplace/products', { params }),
  getProduct: (productId) => api.get(`/api/marketplace/products/${productId}`),
  createProduct: (productData) => api.post('/api/marketplace/products', productData),
};

export const verificationAPI = {
  uploadDocuments: (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    return api.post('/api/verification/upload-documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getStatus: () => api.get('/api/verification/status'),
};

export const onboardAPI = {
  register: (data) => api.post('/api/onboard/register', data),
  uploadDocuments: (userId, docType, files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('doc_type', docType);

    return api.post(`/api/onboard/${userId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getStatus: (userId) => api.get(`/api/onboard/${userId}/status`),
};

export default api;