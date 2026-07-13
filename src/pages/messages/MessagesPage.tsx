import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { listConversations } from '../../services/messageService';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { ChatConversation } from '../../types';
import { MessageCircle } from 'lucide-react';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = async () => {
    if (!user) return;
    try {
      const data = await listConversations(user.id);
      setConversations(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Refresh the list whenever a new message arrives from anyone, so unread
  // counts and ordering stay current even without opening that conversation.
  useEffect(() => {
    if (!socket) return;
    const handleIncoming = () => loadConversations();
    socket.on('chat:receive', handleIncoming);
    return () => {
      socket.off('chat:receive', handleIncoming);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
      {isLoading ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading conversations...</p>
        </div>
      ) : conversations.length > 0 ? (
        <ChatUserList conversations={conversations} />
      ) : (
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="bg-gray-100 p-6 rounded-full mb-4">
            <MessageCircle size={32} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-medium text-gray-900">No messages yet</h2>
          <p className="text-gray-600 text-center mt-2">
            Start connecting with entrepreneurs and investors to begin conversations
          </p>
        </div>
      )}
    </div>
  );
};
