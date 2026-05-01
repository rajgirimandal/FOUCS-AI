# Focus AI - Production-Ready Deployment

This is a production-ready deployment configuration for Focus AI.

## Quick Start (Development)

1. Install dependencies:
   ```bash
   cd backend && npm install
   ```

2. Start the server:
   ```bash
   cd backend && npm start
   ```

3. Open http://localhost:3000 in your browser

## Deployment Options

### Option 1: Local Deployment (Node.js)

```bash
# Install and run
cd backend
npm install
npm start
```

### Option 2: Docker Deployment

```bash
docker-compose up --build
```

### Option 3: Vercel Deployment (Frontend Only)

```bash
cd frontend
vercel
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
```

## Database

The application uses SQLite. The database file is created automatically:
- `backend/focusai.db`

## Features Included

✓ User authentication (signup/login)
✓ Study session tracking (start/pause/end)
✓ Real-time focus scoring
✓ Tab switch detection
✓ Idle time detection (60 second threshold)
✓ Activity logging
✓ Dashboard with daily stats
✓ Session history
✓ Weekly reports
✓ AI recommendations (rule-based)

## Recommended Production Setup

1. Use PostgreSQL instead of SQLite for production
2. Enable HTTPS
3. Set secure JWT_SECRET
4. Add rate limiting
5. Enable CORS restrictions

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/sessions` - Start session
- `GET /api/sessions` - Get sessions
- `PUT /api/sessions/:id` - Update session
- `GET /api/sessions/today` - Today's sessions
- `GET /api/sessions/week` - This week's sessions
- `POST /api/activities` - Log activity
- `GET /api/activities/:sessionId` - Get activities
- `GET /api/stats` - Get user stats
- `POST /api/reports/weekly` - Generate weekly report
- `GET /api/reports` - Get reports
- `GET /api/ai/recommendations` - Get AI recommendations