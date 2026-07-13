import api, { setAccessToken, clearAccessToken } from './api';
import { User, UserRole } from '../types';

// Backend returns Mongo's _id plus internal security fields (isEmailVerified,
// twoFactorEnabled, refreshTokens, etc). The frontend types only need `id`
// and the public profile fields, so we adapt the shape here in one place.
interface BackendUser extends Omit<User, 'id'> {
  _id: string;
  [key: string]: unknown;
}

const toFrontendUser = (backendUser: BackendUser): User => {
  const { _id, ...rest } = backendUser;
  return { id: _id, ...rest } as User;
};

export const registerRequest = async (
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<User> => {
  const { data } = await api.post('/auth/register', { name, email, password, role });
  setAccessToken(data.accessToken);
  return toFrontendUser(data.user);
};

// Returns either the logged-in user, or a 2FA challenge that needs verifyOtpRequest()
export const loginRequest = async (
  email: string,
  password: string,
  role: UserRole
): Promise<{ user: User } | { requires2FA: true; userId: string }> => {
  const { data } = await api.post('/auth/login', { email, password, role });

  if (data.status === 'pending_2fa') {
    return { requires2FA: true, userId: data.userId };
  }

  setAccessToken(data.accessToken);
  return { user: toFrontendUser(data.user) };
};

export const verifyOtpRequest = async (userId: string, otp: string): Promise<User> => {
  const { data } = await api.post('/auth/verify-otp', { userId, otp });
  setAccessToken(data.accessToken);
  return toFrontendUser(data.user);
};

export const logoutRequest = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } finally {
    clearAccessToken();
  }
};

export const forgotPasswordRequest = async (email: string): Promise<void> => {
  await api.post('/auth/forgot-password', { email });
};

export const resetPasswordRequest = async (token: string, newPassword: string): Promise<void> => {
  await api.post('/auth/reset-password', { token, newPassword });
};

export const getMeRequest = async (): Promise<User> => {
  const { data } = await api.get('/auth/me');
  return toFrontendUser(data.user);
};

export const updateProfileRequest = async (updates: Partial<User>): Promise<User> => {
  const { data } = await api.patch('/users/me', updates);
  return toFrontendUser(data.user);
};
