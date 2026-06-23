// ============================================================
// context/AuthContext.jsx — Global Auth State via React Context
// Provides user info and token throughout the app.
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Axios base URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(localStorage.getItem('gst_token') || null);
  const [loading, setLoading] = useState(true);

  // Attach JWT to every Axios request
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedUser  = localStorage.getItem('gst_user');
    const storedToken = localStorage.getItem('gst_token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('gst_user',  JSON.stringify(userData));
    localStorage.setItem('gst_token', jwtToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('gst_user');
    localStorage.removeItem('gst_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
