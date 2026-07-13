import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Phone, Video, Info, Smile, MessageCircle } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Message, ChatConversation, User } from '../../types';
import { getUserById } from '../../services/userService';
import { listConversations, getConversationHistory } from '../../services/messageService';
import toast from 'react-hot-toast';

export const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const socket = useSocket();

  const [chatPartner, setChatPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const loadConversations = async () => {
    if (!currentUser) return;
    try {
      setConversations(await listConversations(currentUser.id));
    } catch {
      // Sidebar list failing shouldn't block the main chat view
    }
  };

  // Load the conversations sidebar
  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Load the chat partner's profile and message history whenever the URL user changes
  useEffect(() => {
    if (!currentUser || !userId) {
      setChatPartner(null);
      setMessages([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [partner, history] = await Promise.all([
          getUserById(userId),
          getConversationHistory(userId),
        ]);
        if (!cancelled) {
          setChatPartner(partner);
          setMessages(history);
        }
      } catch {
        if (!cancelled) {
          toast.error('Could not load this conversation.');
          setChatPartner(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, userId]);

  // Listen for real-time incoming messages from the currently open partner
  useEffect(() => {
    if (!socket || !userId) return;

    const handleIncoming = (message: {
      _id: string;
      sender: string;
      receiver: string;
      content: string;
      isRead: boolean;
      createdAt: string;
    }) => {
      if (message.sender !== userId) return; // not this conversation - MessagesPage handles the sidebar refresh
      setMessages((prev) => [
        ...prev,
        {
          id: message._id,
          senderId: message.sender,
          receiverId: message.receiver,
          content: message.content,
          timestamp: message.createdAt,
          isRead: message.isRead,
        },
      ]);
    };

    socket.on('chat:receive', handleIncoming);
    return () => {
      socket.off('chat:receive', handleIncoming);
    };
  }, [socket, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !userId) return;

    if (!socket) {
      toast.error('Not connected. Please check your connection and try again.');
      return;
    }

    const content = newMessage.trim();
    setIsSending(true);
    setNewMessage('');

    socket.emit(
      'chat:send',
      { receiverId: userId, content },
      (ack: { status: 'ok' | 'error'; message?: any }) => {
        setIsSending(false);
        if (ack?.status === 'ok' && ack.message) {
          setMessages((prev) => [
            ...prev,
            {
              id: ack.message._id,
              senderId: ack.message.sender,
              receiverId: ack.message.receiver,
              content: ack.message.content,
              timestamp: ack.message.createdAt,
              isRead: ack.message.isRead,
            },
          ]);
          loadConversations();
        } else {
          toast.error('Message failed to send. Please try again.');
        }
      }
    );
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white border border-gray-200 rounded-lg overflow-hidden animate-fade-in">
      {/* Conversations sidebar */}
      <div className="hidden md:block w-1/3 lg:w-1/4 border-r border-gray-200">
        <ChatUserList conversations={conversations} />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {chatPartner ? (
          <>
            <div className="border-b border-gray-200 p-4 flex justify-between items-center">
              <div className="flex items-center">
                <Avatar
                  src={chatPartner.avatarUrl}
                  alt={chatPartner.name}
                  size="md"
                  status={chatPartner.isOnline ? 'online' : 'offline'}
                  className="mr-3"
                />

                <div>
                  <h2 className="text-lg font-medium text-gray-900">{chatPartner.name}</h2>
                  <p className="text-sm text-gray-500">
                    {chatPartner.isOnline ? 'Online' : 'Last seen recently'}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Voice call"
                  disabled
                  title="Voice calling isn't wired up yet"
                >
                  <Phone size={18} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Video call"
                  disabled
                  title="Video calling is coming with the Video Call module"
                >
                  <Video size={18} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Info"
                  disabled
                >
                  <Info size={18} />
                </Button>
              </div>
            </div>

            {/* Messages container */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isCurrentUser = message.senderId === currentUser.id;
                    return (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        isCurrentUser={isCurrentUser}
                        senderName={isCurrentUser ? currentUser.name : chatPartner.name}
                        senderAvatarUrl={isCurrentUser ? currentUser.avatarUrl : chatPartner.avatarUrl}
                      />
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <MessageCircle size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700">No messages yet</h3>
                  <p className="text-gray-500 mt-1">Send a message to start the conversation</p>
                </div>
              )}
            </div>

            {/* Message input */}
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Add emoji"
                  disabled
                >
                  <Smile size={20} />
                </Button>

                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  fullWidth
                  className="flex-1"
                />

                <Button
                  type="submit"
                  size="sm"
                  disabled={!newMessage.trim() || isSending}
                  className="rounded-full p-2 w-10 h-10 flex items-center justify-center"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <MessageCircle size={48} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-gray-700">Select a conversation</h2>
            <p className="text-gray-500 mt-2 text-center">
              Choose a contact from the list to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
