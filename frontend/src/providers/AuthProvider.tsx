'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import AuthContext from '@/contexts/AuthContext';
import authService from '@/services/auth';
import { onAuthStateChange } from '@/services/firebaseClient';
import type { User, LoginCredentials } from '@/types/auth';
import { toast } from 'sonner';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!(user && token);

  // Initialize auth state from stored data
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user is already authenticated
        if (authService.isAuthenticated()) {
          const user = authService.getCurrentUser();
          const token = authService.getCurrentToken();
          
          if (user && token) {
            setUser(user);
            setToken(token);
            
            // Skip token validation for now - just use stored data
            // TODO: Implement proper token validation when backend endpoint is ready
            console.log('✅ Using stored authentication data');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const response = await authService.login(credentials);

      setUser(response.user);
      setToken(response.token || response.access_token);

      toast.success('Login successful!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };



  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setToken(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear local state even if logout fails
      setUser(null);
      setToken(null);
    }
  };

  const refreshProfile = async () => {
    try {
      if (!isAuthenticated) return;

      const profile = await authService.getProfile();
      setUser(profile);
    } catch (error: unknown) {
      console.error('Profile refresh error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh profile';
      toast.error(errorMessage);

      // If token is invalid, logout
      if (error instanceof Error && (error.message?.includes('401') || error.message?.includes('unauthorized'))) {
        logout();
      }
    }
  };

  const validateToken = async (): Promise<boolean> => {
    try {
      const isValid = await authService.isAuthenticatedAsync();
      if (!isValid) {
        logout();
      }
      return isValid;
    } catch (error: unknown) {
      console.error('Token validation error:', error);
      logout();
      return false;
    }
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshProfile,
    validateToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}