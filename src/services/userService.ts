import api from './api';
import { User } from '../types';

interface BackendUser extends Omit<User, 'id'> {
  _id: string;
}

const toFrontendUser = (backendUser: BackendUser): User => {
  const { _id, ...rest } = backendUser;
  return { id: _id, ...rest } as User;
};

export const getUserById = async (id: string): Promise<User> => {
  const { data } = await api.get(`/users/${id}`);
  return toFrontendUser(data.user);
};

export const listUsersByRole = async (
  role: 'entrepreneur' | 'investor',
  params?: { search?: string; industry?: string; page?: number; limit?: number }
): Promise<{ users: User[]; total: number }> => {
  const { data } = await api.get(`/users/role/${role}`, { params });
  return { users: data.users.map(toFrontendUser), total: data.total };
};
