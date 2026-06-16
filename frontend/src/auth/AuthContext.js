import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    authApi.clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const token = authApi.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const cachedUser = authApi.getCachedUser();
      if (cachedUser) {
        setUser(cachedUser);
        setLoading(false);
      }

      try {
        const response = await authApi.me();
        if (mounted) {
          setUser(response.data.user);
          authApi.setCachedUser(response.data.user);
        }
      } catch (err) {
        authApi.clearToken();
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted && !cachedUser) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const login = useCallback(async (username, password) => {
    const response = await authApi.login({ username, password });
    authApi.setToken(response.data.token);
    authApi.setCachedUser(response.data.user);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(user)
  }), [user, loading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
