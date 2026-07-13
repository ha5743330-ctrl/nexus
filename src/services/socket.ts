import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
);

let socket: Socket | null = null;

// Creates the socket connection once and reuses it. Called by SocketContext
// after login; the token is re-read at connect time so it's always current.
export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: getAccessToken() },
    withCredentials: true,
    autoConnect: true,
  });

  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = (): Socket | null => socket;
