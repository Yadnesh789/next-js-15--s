import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {
            refreshToken
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.tokens;
          Cookies.set('accessToken', accessToken);
          Cookies.set('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  sendOTP: (phoneNumber: string) =>
    api.post('/auth/send-otp', { phoneNumber }),
  
  verifyOTP: (phoneNumber: string, otp: string, deviceInfo?: string) =>
    api.post('/auth/verify-otp', { phoneNumber, otp, deviceInfo }),
  
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh-token', { refreshToken })
};

// User API
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  getSessions: () => api.get('/user/sessions'),
  logout: () => api.post('/user/logout'),
  logoutSession: (sessionId: string) => api.post(`/user/logout/${sessionId}`),
  logoutAll: () => api.post('/user/logout-all')
};

// Video API
export const videoAPI = {
  getVideos: (params?: { category?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/videos', { params }),
  
  getVideo: (id: string) => api.get(`/videos/${id}`),
  
  getStreamInfo: (id: string) => api.get(`/videos/${id}/stream-info`),
  
  getStreamManifest: (videoId: string) => api.get(`/stream/${videoId}/manifest`)
};

