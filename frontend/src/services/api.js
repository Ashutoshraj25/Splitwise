import axios from 'axios';

// Fallback to localhost:5000 if VITE_API_URL is not set in frontend env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to automatically add JWT token to requests if stored in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth Services
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password, avatarUrl) => api.post('/auth/register', { name, email, password, avatarUrl }),
  getMe: () => api.get('/auth/me'),
};

// Groups Services
export const groupsAPI = {
  getGroups: () => api.get('/groups'),
  createGroup: (groupData) => api.post('/groups', groupData),
  getGroupDetails: (id) => api.get(`/groups/${id}`),
  addMember: (id, email) => api.post(`/groups/${id}/members`, { email }),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  getMessages: (groupId) => api.get(`/groups/${groupId}/messages`),
};

// Expenses Services
export const expensesAPI = {
  createExpense: (expenseData) => api.post('/expenses', expenseData),
  editExpense: (id, expenseData) => api.put(`/expenses/${id}`, expenseData),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
};

// Settlements Services
export const settlementsAPI = {
  recordSettlement: (settlementData) => api.post('/settlements', settlementData),
  getSettlements: (groupId) => api.get(`/settlements/group/${groupId}`),
};

export default api;
