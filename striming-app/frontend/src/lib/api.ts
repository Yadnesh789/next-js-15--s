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
  getVideos: (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
    return api.get('/videos', { params });
  },
  
  getVideo: (id: string) => api.get(`/videos/${id}`),
  
  getStreamInfo: (id: string) => api.get(`/videos/${id}/stream-info`),
  
  getStreamManifest: (videoId: string) => api.get(`/stream/${videoId}/manifest`)
};

// Search API
export interface SearchParams {
  query?: string;
  category?: string;
  sortBy?: 'relevance' | 'date' | 'views' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  minViews?: number;
  maxViews?: number;
  minDuration?: number;
  maxDuration?: number;
}

export interface SearchResult {
  success: boolean;
  videos: Video[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
  meta: {
    query: string;
    category: string;
    sortBy: string;
    sortOrder: string;
  };
  suggestions: string[];
  relatedCategories: { name: string; count: number }[];
}

export interface Video {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  views: number;
  category: string;
  uploadDate: string;
}

export interface Category {
  name: string;
  count: number;
  totalViews: number;
}

export const searchAPI = {
  // Advanced search with filters
  search: (params: SearchParams) => {
    return api.get<SearchResult>('/search', { params });
  },
  
  // Get search suggestions/autocomplete
  getSuggestions: (query: string) => {
    return api.get<{ success: boolean; suggestions: { type: string; text: string }[] }>(
      '/search/suggestions',
      { params: { query } }
    );
  },
  
  // Get trending videos
  getTrending: (limit: number = 10) => {
    return api.get<{ success: boolean; videos: Video[] }>('/search/trending', { params: { limit } });
  },
  
  // Get all categories with counts
  getCategories: () => {
    return api.get<{ success: boolean; categories: Category[] }>('/search/categories');
  },
};

// Admin API
export const adminAPI = {
  // Upload video
  uploadVideo: (formData: FormData, onProgress?: (percent: number) => void) => {
    return api.post('/admin/upload-video', formData, {
      // Don't set Content-Type manually - axios will set it with proper boundary for multipart/form-data
      headers: {
        'Content-Type': undefined,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },

  // Get all videos (admin view)
  getAllVideos: (page: number = 1, limit: number = 10) => {
    return api.get('/admin/videos', { params: { page, limit } });
  },

  // Delete video
  deleteVideo: (videoId: string) => {
    return api.delete(`/admin/videos/${videoId}`);
  },

  // Update video details
  updateVideo: (videoId: string, data: Partial<Video>) => {
    return api.put(`/admin/videos/${videoId}`, data);
  },

  // Get admin dashboard stats
  getDashboardStats: () => {
    return api.get('/admin/stats');
  },
};

