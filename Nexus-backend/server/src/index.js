import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import { securityMiddleware, apiLimiter } from './middleware/security.js';
import { notFound, globalErrorHandler } from './middleware/errorHandler.js';
import { initSocket } from './sockets/videoSignaling.js';
import { stripeWebhook } from './controllers/paymentController.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import connectionRequestRoutes from './routes/connectionRequestRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Stripe webhook needs the raw request body for signature verification, so it
// must be mounted BEFORE express.json() and defined with its own raw parser.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(...securityMiddleware);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use('/api', apiLimiter);

// Serve uploaded files (documents, signatures, avatars).
// Helmet's global X-Frame-Options/Cross-Origin-Resource-Policy headers would otherwise
// block the frontend (different origin/port) from previewing these in an <iframe>/<img>.
app.use(
  '/uploads',
  (req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads'))
);

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/connection-requests', connectionRequestRoutes);

app.use(notFound);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
initSocket(httpServer);

const start = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`Nexus API listening on port ${PORT} [${process.env.NODE_ENV}]`);
  });
};

start();

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...', err);
  httpServer.close(() => process.exit(1));
});
