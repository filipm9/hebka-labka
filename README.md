# Dog Groomer – Client Manager

Mobile-first web app to track dog grooming clients (owners, dogs, notes, tags, search).

## Quick Start (Docker)

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| PostgreSQL | localhost:5432 |

**Default login:** `admin@example.com` / `changeme`

## Running Tests

Tests run in isolated Docker containers (no database required – all calls are mocked).

```bash
# Run all tests
make test

# Run only backend tests
make test-backend

# Run only frontend tests
make test-frontend
```

### Test Coverage

| Suite | Tests | What's Covered |
|-------|-------|----------------|
| Backend | 45 | Auth, Dogs API, Owners API, JWT middleware |
| Frontend | 57 | API client, utility functions (XSS sanitization, tag parsing) |

### Watch Mode (Local Development)

For faster iteration during development, run tests locally with watch mode:

```bash
# Install dependencies first
make install

# Watch mode – re-runs on file changes
make test-watch-backend
make test-watch-frontend
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── routes/       # API endpoints (auth, dogs, owners, users, config)
│   │   ├── auth.js       # JWT middleware
│   │   └── db.js         # PostgreSQL connection
│   └── tests/            # API integration tests
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── api/          # API client
│   │   └── utils/        # Helper functions
│   └── vitest.config.js
├── docker-compose.yml          # Development environment
└── docker-compose.test.yml     # Test environment
```

## Manual Setup (without Docker)

1. Copy `backend/env.example` to `backend/.env` and configure
2. Start PostgreSQL and create database
3. Run migrations:
   ```bash
   cd backend && npm install && npm run dev
   ```
4. Start frontend:
   ```bash
   cd frontend && npm install && npm run dev
   ```

Set `VITE_API_BASE=http://localhost:4000` for the frontend.

## Tech Stack

- **Backend:** Node.js, Express, PostgreSQL, JWT auth
- **Frontend:** React, Vite, TailwindCSS, React Query
- **Testing:** Vitest, Supertest, Testing Library

## Production Deployment (Railway)

### Prerequisites
- Push code to GitHub
- Create account at [railway.app](https://railway.app)

### Deploy Steps

1. **Create PostgreSQL Database**
   - New Project → Add Service → Database → PostgreSQL
   - Railway auto-provisions and provides `DATABASE_URL`

2. **Deploy Backend**
   - Add Service → GitHub Repo → Select this repo
   - Set Root Directory: `backend`
   - Add environment variables:
     - `DATABASE_URL` → Reference from PostgreSQL service
     - `JWT_SECRET` → Generate: `openssl rand -base64 32`
     - `CORS_ORIGIN` → Your frontend URL (set after deploying frontend)
     - `COOKIE_SECURE` → `true`
     - `COOKIE_SAMESITE` → `none`

3. **Deploy Frontend**
   - Add Service → GitHub Repo → Select this repo
   - Set Root Directory: `frontend`
   - Set Dockerfile: `Dockerfile.prod`
   - Add build argument:
     - `VITE_API_BASE` → Your backend URL (e.g., `https://xxx.railway.app`)

4. **Update Backend CORS**
   - Set `CORS_ORIGIN` to your frontend URL

### Post-Deploy Checklist
- [ ] Change default admin password (`admin@example.com` / `changeme`)
- [ ] Verify login works
- [ ] Test data persistence

## Security Notes

- Cookies are `HttpOnly`, `Secure`, `SameSite` configurable
- Use HTTPS in production (Railway provides this automatically)
- Passwords hashed with bcrypt
- XSS protection via HTML sanitization
