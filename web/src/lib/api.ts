import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor to inject JWT token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('medshare_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authApi = {
  register: (data: any) => apiClient.post('/auth/register', data),
  registerRequest: (data: {
    fullName: string;
    identifier: string;
    bloodGroup: string;
    password: string;
    confirmPassword: string;
  }) => apiClient.post('/auth/register-request', data),
  verifyOtp: (data: { identifier: string; otp: string }) =>
    apiClient.post('/auth/verify-otp', data),
  resendOtp: (data: { identifier: string; type?: string }) =>
    apiClient.post('/auth/resend-otp', data),
  forgotPassword: (data: { identifier: string }) =>
    apiClient.post('/auth/forgot-password', data),
  verifyResetOtp: (data: { identifier: string; otp: string }) =>
    apiClient.post('/auth/verify-reset-otp', data),
  resetPassword: (data: {
    identifier: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }) => apiClient.post('/auth/reset-password', data),
  login: (data: { identifier?: string; email?: string; phone?: string; password: string }) =>
    apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
};

export const donorApi = {
  register: (data: any) => apiClient.post('/donors/register', data),
  getProfile: () => apiClient.get('/donors/profile'),
  updateAvailability: (data: { isAvailable: boolean; preferredRadiusKm?: number }) =>
    apiClient.patch('/donors/availability', data),
  getNearby: (params?: { lat?: number; lng?: number; radius?: number; bloodGroup?: string; city?: string }) =>
    apiClient.get('/donors/nearby', { params }),
  getStats: () => apiClient.get('/donors/stats'),
  getMyRequests: () => apiClient.get('/donors/my-requests'),
};

export const bloodRequestApi = {
  create: (data: any) => apiClient.post('/blood-requests', data),
  getAll: (params?: any) => apiClient.get('/blood-requests', { params }),
  getById: (id: string) => apiClient.get(`/blood-requests/${id}`),
  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    apiClient.patch(`/blood-requests/${id}/status`, data),
  respond: (id: string, data: { action: 'ACCEPT' | 'DECLINE' | 'CONFIRM_ARRIVED'; notes?: string }) =>
    apiClient.post(`/blood-requests/${id}/respond`, data),
  getMatches: (id: string) => apiClient.get(`/blood-requests/${id}/matches`),
};

export const medicineApi = {
  scan: (formData: FormData) =>
    apiClient.post('/medicines/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  create: (data: any) => apiClient.post('/medicines', data),
  getAll: (params?: any) => apiClient.get('/medicines', { params }),
  getById: (id: string) => apiClient.get(`/medicines/${id}`),
  verify: (id: string, data: { status: 'VERIFIED' | 'REJECTED'; notes?: string }) =>
    apiClient.post(`/medicines/${id}/verify`, data),
  createRequest: (data: any) => apiClient.post('/medicines/requests', data),
  getRequests: () => apiClient.get('/medicines/requests/list'),
  updateRequestStatus: (id: string, data: { status: string; pharmacyNotes?: string }) =>
    apiClient.patch(`/medicines/requests/${id}/status`, data),
};

export const pharmacyApi = {
  register: (data: any) => apiClient.post('/pharmacies/register', data),
  getAll: (params?: any) => apiClient.get('/pharmacies', { params }),
  getById: (id: string) => apiClient.get(`/pharmacies/${id}`),
  verify: (id: string, data: { status: 'VERIFIED' | 'REJECTED'; notes?: string }) =>
    apiClient.post(`/pharmacies/${id}/verify`, data),
};

export const adminApi = {
  getDashboard: () => apiClient.get('/admin/dashboard'),
  getUsers: (params?: any) => apiClient.get('/admin/users', { params }),
  updateUserStatus: (id: string, data: any) => apiClient.patch(`/admin/users/${id}/status`, data),
  getDonors: (params?: any) => apiClient.get('/admin/donors', { params }),
  verifyDonor: (id: string, data: { status: 'VERIFIED' | 'REJECTED' }) =>
    apiClient.patch(`/admin/donors/${id}/verify`, data),
  getReports: () => apiClient.get('/admin/reports'),
  createReport: (data: any) => apiClient.post('/admin/reports', data),
  updateReportStatus: (id: string, data: { status: string }) =>
    apiClient.patch(`/admin/reports/${id}/status`, data),
  getAnalytics: () => apiClient.get('/admin/analytics'),
};

export const notificationApi = {
  getAll: () => apiClient.get('/notifications'),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
};

export const aiApi = {
  chatAssistant: (messages: any[], userRole?: string) =>
    apiClient.post('/ai/assistant/chat', { messages, userRole }),
  getInsights: () => apiClient.get('/ai/insights'),
};
