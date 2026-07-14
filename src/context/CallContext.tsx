import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { IncomingCallModal } from '../components/calls/IncomingCallModal';
import { OutgoingCallModal } from '../components/calls/OutgoingCallModal';

interface CallPeer {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface OutgoingCall {
  roomId: string;
  peer: CallPeer;
  title?: string;
}

interface IncomingCall {
  roomId: string;
  peer: CallPeer;
  title?: string;
}

interface CallSignalData {
  type: 'invite' | 'accept' | 'decline' | 'busy' | 'cancel' | 'offer' | 'answer' | 'ice';
  roomId: string;
  fromName?: string;
  fromAvatarUrl?: string;
  title?: string;
  [key: string]: unknown;
}

interface CallContextType {
  startCall: (peer: CallPeer, roomId: string, title?: string) => void;
  setCallActive: (active: boolean) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socket = useSocket();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [outgoingCall, setOutgoingCall] = useState<OutgoingCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  // Refs mirror the state above so the socket listener closure always sees the latest value
  const outgoingRef = useRef<OutgoingCall | null>(null);
  const incomingRef = useRef<IncomingCall | null>(null);
  const inCallRef = useRef(false);
  outgoingRef.current = outgoingCall;
  incomingRef.current = incomingCall;

  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleSignal = ({ from, data }: { from: string; data: CallSignalData }) => {
      if (data.type === 'invite') {
        if (incomingRef.current || outgoingRef.current || inCallRef.current) {
          // Already busy with another call - let the caller know instead of ignoring silently
          socket.emit('call:signal', {
            targetUserId: from,
            data: { type: 'busy', roomId: data.roomId },
          });
          return;
        }
        setIncomingCall({
          roomId: data.roomId,
          peer: { id: from, name: data.fromName || 'Someone', avatarUrl: data.fromAvatarUrl },
          title: data.title,
        });
      } else if (data.type === 'accept') {
        if (outgoingRef.current && outgoingRef.current.roomId === data.roomId) {
          const call = outgoingRef.current;
          setOutgoingCall(null);
          navigate(`/call/${call.roomId}`, {
            state: { peer: call.peer, title: call.title },
          });
        }
      } else if (data.type === 'decline') {
        if (outgoingRef.current && outgoingRef.current.roomId === data.roomId) {
          toast.error(`${outgoingRef.current.peer.name} declined the call.`);
          setOutgoingCall(null);
        }
      } else if (data.type === 'busy') {
        if (outgoingRef.current && outgoingRef.current.roomId === data.roomId) {
          toast.error(`${outgoingRef.current.peer.name} is on another call.`);
          setOutgoingCall(null);
        }
      } else if (data.type === 'cancel') {
        if (incomingRef.current && incomingRef.current.roomId === data.roomId) {
          setIncomingCall(null);
        }
      }
    };

    socket.on('call:signal', handleSignal);
    return () => {
      socket.off('call:signal', handleSignal);
    };
  }, [socket, currentUser, navigate]);

  const startCall = (peer: CallPeer, roomId: string, title?: string) => {
    if (!socket) {
      toast.error('Not connected - please refresh and try again.');
      return;
    }
    if (outgoingCall || incomingCall || inCallRef.current) {
      toast.error('You are already on a call.');
      return;
    }
    setOutgoingCall({ roomId, peer, title });
    socket.emit('call:signal', {
      targetUserId: peer.id,
      data: {
        type: 'invite',
        roomId,
        fromName: currentUser?.name,
        fromAvatarUrl: currentUser?.avatarUrl,
        title,
      },
    });
  };

  const cancelOutgoing = () => {
    if (!socket || !outgoingCall) return;
    socket.emit('call:signal', {
      targetUserId: outgoingCall.peer.id,
      data: { type: 'cancel', roomId: outgoingCall.roomId },
    });
    setOutgoingCall(null);
  };

  const acceptIncoming = () => {
    if (!socket || !incomingCall) return;
    socket.emit('call:signal', {
      targetUserId: incomingCall.peer.id,
      data: { type: 'accept', roomId: incomingCall.roomId },
    });
    const call = incomingCall;
    setIncomingCall(null);
    navigate(`/call/${call.roomId}`, { state: { peer: call.peer, title: call.title } });
  };

  const declineIncoming = () => {
    if (!socket || !incomingCall) return;
    socket.emit('call:signal', {
      targetUserId: incomingCall.peer.id,
      data: { type: 'decline', roomId: incomingCall.roomId },
    });
    setIncomingCall(null);
  };

  const setCallActive = (active: boolean) => {
    inCallRef.current = active;
  };

  return (
    <CallContext.Provider value={{ startCall, setCallActive }}>
      {children}
      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.peer.name}
          callerAvatarUrl={incomingCall.peer.avatarUrl}
          title={incomingCall.title}
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
        />
      )}
      {outgoingCall && (
        <OutgoingCallModal
          calleeName={outgoingCall.peer.name}
          calleeAvatarUrl={outgoingCall.peer.avatarUrl}
          onCancel={cancelOutgoing}
        />
      )}
    </CallContext.Provider>
  );
};

export const useCall = (): CallContextType => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
