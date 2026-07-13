import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/tokens.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';

/**
 * Sets up Socket.IO for two things:
 *  1. WebRTC signaling for the video call rooms (join/leave, offer/answer/ICE relay,
 *     toggle audio/video, end call).
 *  2. Real-time chat delivery (a lightweight companion to the REST message history API).
 *
 * Auth: the client connects with `io(url, { auth: { token: accessToken } })`.
 */
export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user._id);

    // Personal room so other users/services can reach this user directly (e.g. call invites)
    socket.join(`user:${userId}`);

    // ---------- Video call signaling ----------
    socket.on('call:join', ({ roomId }) => {
      socket.join(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit('call:peer-joined', {
        userId,
        name: socket.user.name,
      });
    });

    socket.on('call:leave', ({ roomId }) => {
      socket.leave(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit('call:peer-left', { userId });
    });

    // WebRTC offer/answer/ICE candidate relay - payload is opaque to the server
    socket.on('call:signal', ({ roomId, targetUserId, data }) => {
      const destination = targetUserId ? `user:${targetUserId}` : `room:${roomId}`;
      socket.to(destination).emit('call:signal', { from: userId, data });
    });

    socket.on('call:toggle-media', ({ roomId, audio, video }) => {
      socket.to(`room:${roomId}`).emit('call:peer-toggle-media', { userId, audio, video });
    });

    socket.on('call:end', ({ roomId }) => {
      io.to(`room:${roomId}`).emit('call:ended', { endedBy: userId });
    });

    // ---------- Chat ----------
    socket.on('chat:send', async ({ receiverId, content }, ack) => {
      try {
        const message = await Message.create({ sender: userId, receiver: receiverId, content });
        io.to(`user:${receiverId}`).emit('chat:receive', message);
        ack?.({ status: 'ok', message });
      } catch (err) {
        ack?.({ status: 'error', message: err.message });
      }
    });

    socket.on('chat:typing', ({ receiverId, isTyping }) => {
      io.to(`user:${receiverId}`).emit('chat:typing', { userId, isTyping });
    });

    // ---------- Presence ----------
    socket.on('disconnect', async () => {
      socket.user.isOnline = false;
      await socket.user.save({ validateBeforeSave: false });
      socket.broadcast.emit('presence:offline', { userId });
    });
  });

  return io;
};
