import api from './api';
import { Meeting, MeetingStatus, User } from '../types';

interface BackendUserRef {
  _id: string;
  name?: string;
  avatarUrl?: string;
  role?: string;
}

interface BackendMeeting {
  _id: string;
  organizer: BackendUserRef;
  participant: BackendUserRef;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  roomId?: string;
  createdAt: string;
}

const toFrontendUserRef = (ref: BackendUserRef): User => ({
  id: ref._id,
  name: ref.name || 'Unknown user',
  email: '',
  role: (ref.role as User['role']) || 'entrepreneur',
  avatarUrl: ref.avatarUrl || '',
  bio: '',
  createdAt: '',
});

const toFrontendMeeting = (m: BackendMeeting): Meeting => ({
  id: m._id,
  organizer: toFrontendUserRef(m.organizer),
  participant: toFrontendUserRef(m.participant),
  title: m.title,
  description: m.description || '',
  startTime: m.startTime,
  endTime: m.endTime,
  status: m.status,
  roomId: m.roomId,
  createdAt: m.createdAt,
});

export const listMyMeetings = async (params?: {
  status?: MeetingStatus;
  from?: string;
  to?: string;
}): Promise<Meeting[]> => {
  const { data } = await api.get('/meetings', { params });
  return (data.meetings as BackendMeeting[]).map(toFrontendMeeting);
};

export const createMeeting = async (payload: {
  participantId: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
}): Promise<Meeting> => {
  const { data } = await api.post('/meetings', payload);
  return toFrontendMeeting(data.meeting);
};

export const updateMeetingStatus = async (
  meetingId: string,
  status: Extract<MeetingStatus, 'accepted' | 'rejected' | 'cancelled' | 'completed'>
): Promise<Meeting> => {
  const { data } = await api.patch(`/meetings/${meetingId}/status`, { status });
  return toFrontendMeeting(data.meeting);
};

export const deleteMeeting = async (meetingId: string): Promise<void> => {
  await api.delete(`/meetings/${meetingId}`);
};
