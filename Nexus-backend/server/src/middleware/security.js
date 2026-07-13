import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

// General API rate limiter (auth routes have their own tighter limiter)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many requests. Please slow down.' },
});

export const corsOptions = {
  origin: process.env.CLIENT_URL,
  credentials: true,
};

// Applied in index.js: helmet (secure headers), mongoSanitize (strips $/. operators
// to prevent NoSQL injection), xss (strips malicious HTML/script from inputs)
export const securityMiddleware = [helmet(), mongoSanitize(), xss(), cors(corsOptions)];
