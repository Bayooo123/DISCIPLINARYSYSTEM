import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tidds_token');
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('tidds_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('tidds_token', data.token);
    setUser(data.user);
    return data.user;
  }

  async function signup(email, fullName, password) {
    const data = await api.post('/auth/signup', { email, fullName, password });
    localStorage.setItem('tidds_token', data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('tidds_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
