import api from './api';
import { Message, ChatConversation, User } from '../types';

interface BackendUserRef {
  _id: string;
  name?: string;
  avatarUrl?: string;
  role?: string;
  isOnline?: boolean;
}

interface BackendMessage {
  _id: string;
  sender: string | BackendUserRef;
  receiver: string | BackendUserRef;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface BackendConversation {
  _id: string; // partner's user id
  lastMessage: BackendMessage;
  unreadCount: number;
  partner: BackendUserRef;
}

const refId = (ref: string | BackendUserRef): string => (typeof ref === 'string' ? ref : ref._id);

const toFrontendMessage = (msg: BackendMessage): Message => ({
  id: msg._id,
  senderId: refId(msg.sender),
  receiverId: refId(msg.receiver),
  content: msg.content,
  timestamp: msg.createdAt,
  isRead: msg.isRead,
});

const toFrontendPartner = (partner: BackendUserRef): User => ({
  id: partner._id,
  name: partner.name || 'Unknown user',
  email: '',
  role: (partner.role as User['role']) || 'entrepreneur',
  avatarUrl: partner.avatarUrl || '',
  bio: '',
  isOnline: partner.isOnline,
  createdAt: '',
});

const toFrontendConversation = (currentUserId: string, conv: BackendConversation): ChatConversation => ({
  id: `conv-${currentUserId}-${conv._id}`,
  participants: [currentUserId, conv._id],
  lastMessage: toFrontendMessage(conv.lastMessage),
  updatedAt: conv.lastMessage.createdAt,
  partner: toFrontendPartner(conv.partner),
  unreadCount: conv.unreadCount,
});

export const listConversations = async (currentUserId: string): Promise<ChatConversation[]> => {
  const { data } = await api.get('/messages');
  return (data.conversations as BackendConversation[]).map((c) =>
    toFrontendConversation(currentUserId, c)
  );
};

export const getConversationHistory = async (partnerId: string): Promise<Message[]> => {
  const { data } = await api.get(`/messages/${partnerId}`);
  return (data.messages as BackendMessage[]).map(toFrontendMessage);
};
