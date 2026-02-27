import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      return { ...state, user: action.payload.user, isAuthenticated: true, isLoading: false, error: null };
    case 'AUTH_FAIL':
      return { ...state, user: null, isAuthenticated: false, isLoading: false, error: action.payload };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, isLoading: false, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        dispatch({ type: 'AUTH_FAIL', payload: null });
        return;
      }

      try {
        const response = await api.get('/auth/me');
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: response.data.data.user } });
      } catch (error) {
        localStorage.removeItem('accessToken');
        dispatch({ type: 'AUTH_FAIL', payload: null });
      }
    };

    checkAuth();
  }, []);

  const register = useCallback(async (name, email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await api.post('/auth/register', { name, email, password });
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: true, message: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Kayıt başarısız';
      dispatch({ type: 'AUTH_FAIL', payload: message });
      return { success: false, message };
    }
  }, []);

  const login = useCallback(async (email, password, twoFactorCode) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await api.post('/auth/login', { email, password, twoFactorCode });

      // 2FA gerekiyorsa
      if (response.data.requiresTwoFactor) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return { success: false, requiresTwoFactor: true };
      }

      const { user, accessToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user } });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Giriş başarısız';
      dispatch({ type: 'AUTH_FAIL', payload: message });
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const updateUser = useCallback((userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const isAdmin = state.user?.role === 'admin';
  const isModerator = ['admin', 'moderator'].includes(state.user?.role);

  const value = {
    ...state,
    register,
    login,
    logout,
    updateUser,
    clearError,
    isAdmin,
    isModerator,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalıdır');
  }
  return context;
};

export default AuthContext;
