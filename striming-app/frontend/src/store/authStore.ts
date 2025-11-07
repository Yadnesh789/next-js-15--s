import { create } from 'zustand';
import Cookies from 'js-cookie';
import { authAPI, userAPI } from '@/lib/api';

interface User {
  id: string;
  phoneNumber: string;
  isVerified: boolean;
}

interface Session {
  sessionId: string;
  deviceInfo: string;
  ipAddress: string;
  lastActive: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessions: Session[];
  
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  login: (phoneNumber: string, otp: string, deviceInfo?: string) => Promise<void>;
  logout: () => void;
  logoutSession: (sessionId: string) => Promise<void>;
  logoutAll: () => Promise<void>;
  loadUser: () => Promise<void>;
  loadSessions: () => Promise<void>;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  sessions: [],

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setTokens: (accessToken, refreshToken) => {
    Cookies.set('accessToken', accessToken, { expires: 7 });
    Cookies.set('refreshToken', refreshToken, { expires: 30 });
  },

  login: async (phoneNumber, otp, deviceInfo) => {
    try {
      set({ isLoading: true });
      const response = await authAPI.verifyOTP(phoneNumber, otp, deviceInfo);
      
      const { user, tokens } = response.data;
      
      get().setTokens(tokens.accessToken, tokens.refreshToken);
      get().setUser(user);
      
      // Load sessions
      await get().loadSessions();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await userAPI.logout();
    } catch (error) {
      // Logout error
    } finally {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      set({ user: null, isAuthenticated: false, sessions: [] });
    }
  },

  logoutSession: async (sessionId) => {
    try {
      await userAPI.logoutSession(sessionId);
      await get().loadSessions();
    } catch (error) {
      throw error;
    }
  },

  logoutAll: async () => {
    try {
      await userAPI.logoutAll();
    } catch (error) {
      // Logout all error
    } finally {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      set({ user: null, isAuthenticated: false, sessions: [] });
    }
  },

  loadUser: async () => {
    try {
      const response = await userAPI.getProfile();
      set({ user: response.data.user, isAuthenticated: true });
    } catch (error) {
      set({ user: null, isAuthenticated: false });
    }
  },

  loadSessions: async () => {
    try {
      const response = await userAPI.getSessions();
      set({ sessions: response.data.sessions });
    } catch (error) {
      // Failed to load sessions
    }
  },

  checkAuth: () => {
    const accessToken = Cookies.get('accessToken');
    if (accessToken) {
      get().loadUser();
    } else {
      set({ user: null, isAuthenticated: false });
    }
  }
}));

