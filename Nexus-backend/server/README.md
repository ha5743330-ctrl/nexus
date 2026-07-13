# Nexus Backend

Node.js + Express + MongoDB (Mongoose) API for the Nexus Investor & Entrepreneur
Collaboration Platform. Implements Milestones 1–8 of the internship task doc:
auth/profiles, meeting scheduling, WebRTC video signaling, document chamber
with e-signature, mock payments (Stripe sandbox), and security hardening.

## Setup

```bash
cd server
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, etc.
npm run dev             # starts on http://localhost:5000
```

Requires a running MongoDB instance (local `mongod` or a MongoDB Atlas URI in `MONGO_URI`).

Optional: `npm run seed` populates two sample accounts:
- `ayesha@nexus.dev` / `Password123` (entrepreneur)
- `david@nexus.dev` / `Password123` (investor)

## Connecting the frontend

The frontend (Vite + React) currently mocks everything through `AuthContext` /
`localStorage`. Point it at this API by:
1. Setting a `VITE_API_URL=http://localhost:5000/api` env var in the frontend.
2. Replacing the mock calls in `AuthContext.tsx` with `fetch`/`axios` calls to
   the endpoints below (send `credentials: 'include'` so the refresh-token
   cookie is sent).
3. Connecting `src/services/socket.ts` (create this) to
   `io(import.meta.env.VITE_API_URL, { auth: { token: accessToken } })` for
   chat and video signaling.

## API Overview

All protected routes require `Authorization: Bearer <accessToken>`.

### Auth — `/api/auth`
| Method | Route | Description |
|---|---|---|
| POST | `/register` | Create account (role: entrepreneur/investor) |
| POST | `/login` | Login; returns access token or triggers 2FA OTP email |
| POST | `/verify-otp` | Complete login when 2FA is enabled |
| POST | `/refresh` | Exchange refresh cookie for new access token |
| POST | `/logout` | Invalidate refresh token |
| POST | `/forgot-password` | Send password reset email |
| POST | `/reset-password` | Reset password with emailed token |
| GET | `/me` | Get current authenticated user |

### Users — `/api/users`
| Method | Route | Description |
|---|---|---|
| PATCH | `/me` | Update own profile |
| GET | `/role/:role` | List investors or entrepreneurs (search/filter/paginate) |
| GET | `/:id` | Get a public profile |

### Meetings — `/api/meetings`
| Method | Route | Description |
|---|---|---|
| POST | `/` | Schedule a meeting (conflict-checked for both users) |
| GET | `/` | List my meetings (filter by status/date range) |
| PATCH | `/:id/status` | Accept / reject / cancel / complete |
| DELETE | `/:id` | Delete (organizer only) |

### Documents — `/api/documents`
| Method | Route | Description |
|---|---|---|
| POST | `/` | Upload a document (multipart `file` field) |
| GET | `/` | List documents I own or that are shared with me |
| GET | `/:id` | Get one document |
| POST | `/:id/share` | Share with other users, marks `pending_signature` |
| POST | `/:id/sign` | Attach e-signature image (multipart `signature` field) |
| DELETE | `/:id` | Delete (owner only) |

### Payments — `/api/payments`
| Method | Route | Description |
|---|---|---|
| POST | `/deposit` | Create Stripe PaymentIntent (or mock if no Stripe key set) |
| POST | `/withdraw` | Mock withdrawal |
| POST | `/transfer` | Transfer between two platform users |
| GET | `/transactions` | My transaction history |
| POST | `/webhook` | Stripe webhook (raw body, not for direct frontend use) |

### Messages — `/api/messages`
| Method | Route | Description |
|---|---|---|
| GET | `/` | List conversations with last message + unread count |
| GET | `/:userId` | Full message history with one user (marks as read) |

## Real-time (Socket.IO)

Connect with `auth: { token: accessToken }`. Events:
- `call:join` / `call:leave` / `call:signal` / `call:toggle-media` / `call:end` — WebRTC signaling
- `chat:send` / `chat:receive` / `chat:typing` — real-time chat
- `presence:offline` — broadcast when a user disconnects

## Security features implemented

- JWT access + refresh tokens (refresh token in httpOnly cookie)
- bcrypt password hashing (cost factor 12)
- 2FA mock via emailed OTP (Nodemailer; logs to console if no SMTP configured)
- helmet secure headers, CORS locked to `CLIENT_URL`
- express-mongo-sanitize (NoSQL injection) + xss-clean (script injection)
- express-validator on all mutating routes
- Rate limiting (tighter on `/api/auth/*`)
- Role-based route authorization (`restrictTo`, ownership checks)

## Not yet wired to the frontend

This scaffold is Week 1 focused (auth/profiles) with Week 2/3 modules
(meetings, video, documents, payments) fully built but still using the
frontend's mock data layer. Next step: replace `AuthContext.tsx` and the
mock data files in `src/data/` with calls to these endpoints.
