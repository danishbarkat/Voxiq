# WinFi Dialer System

Monorepo structure:
- `backend/` NestJS API
- `frontend/` React app (Vite)
- `docs/` product + architecture docs

## Quick start (local)
1) Start dependencies:
   ```bash
   docker compose up -d
   ```

2) Backend:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run start:dev
   ```

3) Frontend:
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

## Health check
- API: `http://localhost:3000/health`
- UI: `http://localhost:5173`
