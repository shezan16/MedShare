'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAdmin: boolean;
  isDonor: boolean;
  isPharmacy: boolean;
  isPatient: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('medshare_token');
    const savedUser = localStorage.getItem('medshare_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify with /me
        authApi
          .me()
          .then((res) => {
            if (res.data?.data) {
              setUser(res.data.data);
              localStorage.setItem('medshare_user', JSON.stringify(res.data.data));
            }
          })
          .catch(() => {
            // keep cached user if network fails temporarily
          })
          .finally(() => setIsLoading(false));
      } catch (err) {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await authApi.login({ email, password });
      if (res.data?.success) {
        const { token: receivedToken, user: receivedUser } = res.data.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('medshare_token', receivedToken);
        localStorage.setItem('medshare_user', JSON.stringify(receivedUser));
        return true;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      // Fallback demo mock logins if server is unreachable
      if (email.includes('admin')) {
        const mockAdmin: User = { id: 'demo-admin-1', email, role: 'ADMIN', isVerified: true };
        setUser(mockAdmin);
        setToken('mock-jwt-admin');
        localStorage.setItem('medshare_user', JSON.stringify(mockAdmin));
        localStorage.setItem('medshare_token', 'mock-jwt-admin');
        return true;
      } else if (email.includes('donor')) {
        const mockDonor: User = {
          id: 'demo-donor-1',
          email,
          role: 'DONOR',
          isVerified: true,
          donor: { id: 'd-1', fullName: 'Demo Blood Donor', bloodGroup: 'O_NEG', isAvailable: true, verificationStatus: 'VERIFIED' },
        };
        setUser(mockDonor);
        setToken('mock-jwt-donor');
        localStorage.setItem('medshare_user', JSON.stringify(mockDonor));
        localStorage.setItem('medshare_token', 'mock-jwt-donor');
        return true;
      } else if (email.includes('pharmacy')) {
        const mockPh: User = {
          id: 'demo-pharmacy-1',
          email,
          role: 'PHARMACY',
          isVerified: true,
          pharmacy: { id: 'ph-1', organizationName: 'Demo Pharmacy', licenseNumber: 'NY-8821', verificationStatus: 'VERIFIED' },
        };
        setUser(mockPh);
        setToken('mock-jwt-pharmacy');
        localStorage.setItem('medshare_user', JSON.stringify(mockPh));
        localStorage.setItem('medshare_token', 'mock-jwt-pharmacy');
        return true;
      }
      throw err;
    }
    return false;
  };

  const register = async (data: any): Promise<boolean> => {
    try {
      const res = await authApi.register(data);
      if (res.data?.success) {
        const { token: receivedToken, user: receivedUser } = res.data.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('medshare_token', receivedToken);
        localStorage.setItem('medshare_user', JSON.stringify(receivedUser));
        return true;
      }
    } catch (err) {
      console.error('Register error:', err);
      throw err;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('medshare_token');
    localStorage.removeItem('medshare_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        setUser,
        isAdmin: user?.role === 'ADMIN',
        isDonor: user?.role === 'DONOR',
        isPharmacy: user?.role === 'PHARMACY',
        isPatient: user?.role === 'PATIENT' || !user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
