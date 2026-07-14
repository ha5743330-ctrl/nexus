import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

interface CallSignalData {
  type: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  [key: string]: unknown;
}

interface LocationState {
  peer?: { id: string; name: string; avatarUrl?: string };
  title?: string;
}

export const VideoCallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user: currentUser } = useAuth();
  const { setCallActive } = useCall();

  const state = (location.state as LocationState) || {};

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const otherUserIdRef = useRef<string | null>(state.peer?.id || null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteName, setRemoteName] = useState(state.peer?.name || 'Participant');
  const [remoteMicOn, setRemoteMicOn] = useState(true);
  const [remoteCamOn, setRemoteCamOn] = useState(true);
  const [status, setStatus] = useState('Connecting...');

  // Mark this call as active globally so a second incoming invite is auto-declined as busy
  useEffect(() => {
    setCallActive(true);
    return () => setCallActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupAndLeave = (message?: string) => {
    if (socket && roomId) socket.emit('call:leave', { roomId });
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (message) toast(message);
    navigate(-1);
  };

  // Set up media + peer connection once socket and roomId are ready
  useEffect(() => {
    if (!socket || !roomId) return;
    let cancelled = false;

    const setup = async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        toast.error('Camera/microphone access is required for video calls.');
        navigate(-1);
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteConnected(true);
        setStatus('Connected');
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && otherUserIdRef.current) {
          socket.emit('call:signal', {
            targetUserId: otherUserIdRef.current,
            data: { type: 'ice', roomId, candidate: event.candidate.toJSON() },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setStatus('Connection lost');
        }
      };

      socket.emit('call:join', { roomId });
      setStatus('Waiting for the other participant...');
    };

    setup();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  // Socket event listeners for signaling and presence
  useEffect(() => {
    if (!socket || !roomId) return;

    const handlePeerJoined = async ({ userId, name }: { userId: string; name: string }) => {
      otherUserIdRef.current = userId;
      setRemoteName(name);
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:signal', {
          targetUserId: userId,
          data: { type: 'offer', roomId, sdp: offer },
        });
      } catch {
        toast.error('Could not start the call connection.');
      }
    };

    const handleSignal = async ({ from, data }: { from: string; data: CallSignalData }) => {
      const pc = pcRef.current;
      if (!pc) return;

      if (data.type === 'offer' && data.sdp) {
        otherUserIdRef.current = from;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        for (const candidate of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call:signal', {
          targetUserId: from,
          data: { type: 'answer', roomId, sdp: answer },
        });
      } else if (data.type === 'answer' && data.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === 'ice' && data.candidate) {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch {
            // ignore late/duplicate candidates
          }
        } else {
          pendingCandidatesRef.current.push(data.candidate);
        }
      }
    };

    const handlePeerLeft = () => {
      setRemoteConnected(false);
      setStatus('Other participant left');
      toast('The other participant left the call.');
    };

    const handleEnded = () => {
      cleanupAndLeave('Call ended.');
    };

    const handlePeerToggleMedia = ({ audio, video }: { audio: boolean; video: boolean }) => {
      setRemoteMicOn(audio);
      setRemoteCamOn(video);
    };

    socket.on('call:peer-joined', handlePeerJoined);
    socket.on('call:signal', handleSignal);
    socket.on('call:peer-left', handlePeerLeft);
    socket.on('call:ended', handleEnded);
    socket.on('call:peer-toggle-media', handlePeerToggleMedia);

    return () => {
      socket.off('call:peer-joined', handlePeerJoined);
      socket.off('call:signal', handleSignal);
      socket.off('call:peer-left', handlePeerLeft);
      socket.off('call:ended', handleEnded);
      socket.off('call:peer-toggle-media', handlePeerToggleMedia);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  const toggleMic = () => {
    const next = !micOn;
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
    socket?.emit('call:toggle-media', { roomId, audio: next, video: camOn });
  };

  const toggleCam = () => {
    const next = !camOn;
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
    socket?.emit('call:toggle-media', { roomId, audio: micOn, video: next });
  };

  const endCall = () => {
    socket?.emit('call:end', { roomId });
    cleanupAndLeave();
  };

  if (!currentUser) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-gray-900 flex flex-col">
      <div className="px-6 py-4 text-white flex items-center justify-between">
        <div>
          <h1 className="font-medium">{state.title || `Call with ${remoteName}`}</h1>
          <p className="text-xs text-gray-400">{status}</p>
        </div>
      </div>

      <div className="flex-1 relative">
        {/* Remote video (main) */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          {remoteConnected ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-gray-400">
              <div className="h-20 w-20 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-3 animate-pulse">
                <UserIcon size={32} />
              </div>
              <p>{status}</p>
            </div>
          )}
          {remoteConnected && !remoteCamOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center text-gray-400">
                <div className="h-20 w-20 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-3">
                  <UserIcon size={32} />
                </div>
                <p>{remoteName}'s camera is off</p>
              </div>
            </div>
          )}
          {remoteConnected && !remoteMicOn && (
            <div className="absolute top-4 left-4 bg-gray-900/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <MicOff size={12} /> Muted
            </div>
          )}
        </div>

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-6 right-6 w-40 sm:w-56 aspect-video rounded-lg overflow-hidden bg-gray-700 shadow-lg ring-1 ring-white/10">
          {camOn ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <UserIcon size={24} />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="py-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={toggleMic}
          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
            micOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white text-gray-900'
          }`}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          type="button"
          onClick={toggleCam}
          aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
            camOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white text-gray-900'
          }`}
        >
          {camOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
        </button>

        <button
          type="button"
          onClick={endCall}
          aria-label="End call"
          className="h-12 w-12 rounded-full bg-error-500 hover:bg-error-600 text-white flex items-center justify-center"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};
