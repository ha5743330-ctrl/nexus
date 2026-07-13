import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import { getAccessToken, clearAccessToken } from '../services/api';
import {
  loginRequest,
  registerRequest,
  logoutRequest,
  forgotPasswordRequest,
  resetPasswordRequest,
  getMeRequest,
  updateProfileRequest,
} from '../services/authService';
import toast from 'react-hot-toast';

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On initial load, if we have an access token, ask the backend who we are.
  // (The refresh-token cookie means this also works after a page reload even
  // if the access token itself expired - the axios interceptor refreshes it.)
  useEffect(() => {
    const restoreSession = async () => {
      if (!getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await getMeRequest();
        setUser(currentUser);
      } catch {
        clearAccessToken();
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await loginRequest(email, password, role);
      if ('requires2FA' in result) {
        // 2FA is only enabled if a user explicitly turns it on in settings;
        // there's no OTP-entry screen yet, so surface this clearly for now.
        throw new Error('Two-factor verification required. OTP screen not yet implemented.');
      }
      setUser(result.user);
      toast.success('Successfully logged in!');
    } catch (error) {
      const message = axiosErrorMessage(error, 'Invalid credentials or user not found');
      toast.error(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ): Promise<void> => {
    setIsLoading(true);
    try {
      const newUser = await registerRequest(name, email, password, role);
      setUser(newUser);
      toast.success('Account created successfully!');
    } catch (error) {
      const message = axiosErrorMessage(error, 'Could not create account');
      toast.error(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      await forgotPasswordRequest(email);
      toast.success('If that email is registered, reset instructions have been sent.');
    } catch (error) {
      const message = axiosErrorMessage(error, 'Could not process request');
      toast.error(message);
      throw new Error(message);
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      await resetPasswordRequest(token, newPassword);
      toast.success('Password reset successfully. Please log in.');
    } catch (error) {
      const message = axiosErrorMessage(error, 'Invalid or expired reset token');
      toast.error(message);
      throw new Error(message);
    }
  };

  const logout = async (): Promise<void> => {
    await logoutRequest();
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateProfile = async (_userId: string, updates: Partial<User>): Promise<void> => {
    try {
      const updatedUser = await updateProfileRequest(updates);
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (error) {
      const message = axiosErrorMessage(error, 'Could not update profile');
      toast.error(message);
      throw new Error(message);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Pulls the backend's validation/error message out of an axios error, if present
function axiosErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as any).response?.data?.message === 'string'
  ) {
    return (error as any).response.data.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
