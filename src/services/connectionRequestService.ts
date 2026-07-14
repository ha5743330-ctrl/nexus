import api from './api';
import { CollaborationRequest } from '../types';

interface BackendUserRef {
  _id: string;
  name?: string;
  avatarUrl?: string;
  role?: string;
}

interface BackendConnectionRequest {
  _id: string;
  investor: BackendUserRef;
  entrepreneur: BackendUserRef;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

const toFrontend = (r: BackendConnectionRequest): CollaborationRequest => ({
  id: r._id,
  investorId: r.investor._id,
  investorName: r.investor.name || 'Unknown investor',
  investorAvatarUrl: r.investor.avatarUrl || '',
  entrepreneurId: r.entrepreneur._id,
  entrepreneurName: r.entrepreneur.name || 'Unknown entrepreneur',
  entrepreneurAvatarUrl: r.entrepreneur.avatarUrl || '',
  message: r.message || '',
  status: r.status,
  createdAt: r.createdAt,
});

export const listMyConnectionRequests = async (): Promise<CollaborationRequest[]> => {
  const { data } = await api.get('/connection-requests');
  return (data.requests as BackendConnectionRequest[]).map(toFrontend);
};

export const sendConnectionRequest = async (
  entrepreneurId: string,
  message: string
): Promise<CollaborationRequest> => {
  const { data } = await api.post('/connection-requests', { entrepreneurId, message });
  return toFrontend(data.request);
};

export const updateConnectionRequestStatus = async (
  requestId: string,
  status: 'accepted' | 'rejected'
): Promise<CollaborationRequest> => {
  const { data } = await api.patch(`/connection-requests/${requestId}/status`, { status });
  return toFrontend(data.request);
};
