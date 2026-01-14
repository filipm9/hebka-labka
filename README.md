# Dog Groomer – simple client manager

Mobile-first web app to track dog grooming clients (owners + dogs, notes, search).

## Prereqs
- Node 18+
- PostgreSQL (local or cloud)

## One-command local run (Docker)
```bash
cd dog-groomer
docker compose up --build
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Postgres: localhost:5432 (user/pass: postgres/postgres, db: doggroomer)
- Default login: admin@example.com / changeme

### What containers do
- db: Postgres 16 with trigram ext; auto-runs `docker/init-db.sql` to create tables and seed the user.
- backend: Express API; env wired via compose; uses db service.
- frontend: Vite build served via `npm run preview --host --port 5173` against backend.

## Manual (non-Docker) – optional
If you prefer running without containers, see `backend/env.example` then run `npm install && npm run dev` in each app, setting `VITE_API_BASE=http://localhost:4000`.

## Login
- Email: `admin@example.com`
- Password: `changeme`

## Notes
- Cookies are `HttpOnly`, `Secure`, `SameSite=Lax`; use HTTPS in production.
- Backend search uses trigram indexes for fast partial matching on dog and owner names.

