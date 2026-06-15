import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-load session on start (using simple mock storage or Supabase checks)
  useEffect(() => {
    const savedUser = localStorage.getItem('pbms_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  /**
   * Login handler
   */
  const login = async (email, password) => {
    setLoading(true);
    try {
      // Mock login credentials logic matching active roles
      let role = 'STAFF';
      let name = 'Gate Operator';

      if (email.includes('admin')) {
        role = 'ADMIN';
        name = 'System Administrator';
      } else if (email.includes('manager')) {
        role = 'MANAGER';
        name = 'Facility Manager';
      }

      const userData = {
        id: 'usr_' + Math.random().toString(36).substr(2, 9),
        email,
        full_name: name,
        role: role
      };

      setUser(userData);
      localStorage.setItem('pbms_user', JSON.stringify(userData));
      return userData;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout handler
   */
  const logout = async () => {
    setUser(null);
    localStorage.removeItem('pbms_user');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider wrapper.');
  }
  return context;
};
