import { useState, useEffect, useRef } from 'react';
import { AuthContext } from './authContextInstance';
import { authService } from '../services/authService';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const authRequestId = useRef(0);

  // The server session cookie is the source of truth for authentication.
  useEffect(() => {
    const requestId = ++authRequestId.current;
    const initAuth = async () => {
      try {
        const response = await authService.getProfile();
        if (requestId !== authRequestId.current) return;
        setUser(response.user);
        localStorage.setItem('nextour_user', JSON.stringify(response.user));
      } catch (error) {
        if (requestId !== authRequestId.current) return;
        if (error.status !== 401) {
          console.error('Unable to restore the login session:', error);
        }
        setUser(null);
        localStorage.removeItem('nextour_user');
        localStorage.removeItem('nextour_token');
        localStorage.removeItem('nexTourUser');
      } finally {
        if (requestId === authRequestId.current) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      if (requestId === authRequestId.current) {
        authRequestId.current += 1;
      }
    };
  }, []);

  /**
   * Login handler
   */
  const login = async (credentials) => {
    authRequestId.current += 1;
    setLoading(true);
    try {
      const res = await authService.login(credentials);
      if (!res.success || !res.user) {
        throw new Error(res.message || 'Login failed.');
      }
      setUser(res.user);
      if (res.token) {
        localStorage.setItem('nextour_token', res.token);
      } else {
        localStorage.removeItem('nextour_token');
      }
      localStorage.setItem('nextour_user', JSON.stringify(res.user));
      return res;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register handler
   */
  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await authService.register(userData);
      return res;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update User in local state
   */
  const updateUser = (updatedData) => {
    const newUserData = { ...user, ...updatedData };
    setUser(newUserData);
    localStorage.setItem('nextour_user', JSON.stringify(newUserData));
  };

  /**
   * Logout handler
   */
  const logout = async () => {
    authRequestId.current += 1;
    await authService.logout();
    setUser(null);
    localStorage.removeItem('nextour_token');
    localStorage.removeItem('nextour_user');
    localStorage.removeItem('nexTourUser');
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'Admin',
    login,
    register,
    updateUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
