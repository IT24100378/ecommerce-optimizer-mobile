# Railway Deployment Guide (Backend + AI Service + Mobile)

This project is deployed on Railway using two services from the same repo:
- `backend` (Node.js + Prisma + MongoDB)
- `ai_service` (FastAPI + XGBoost)

## 1) Prerequisites

- GitHub repo with this project pushed
- Railway account + project created
- MongoDB Atlas connection string

## 2) Create Railway Services

In Railway project:

1. Add service from GitHub repo for backend
   - Root Directory: `backend`
   - Railway will use `backend/railway.json`

2. Add service from GitHub repo for AI
   - Root Directory: `ai_service`
   - Railway will use `ai_service/railway.json`

## 3) Configure Environment Variables

### Backend service variables

- `NODE_ENV=production`
- `PORT=5000` (optional, Railway injects `PORT`)
- `DATABASE_URL=<your-mongodb-atlas-uri>`
- `JWT_SECRET=<strong-random-secret>`
- `JWT_EXPIRES_IN=8h`
- `CORS_ORIGIN=*` (tighten later)
- `AI_SERVICE_API_KEY=<shared-secret>`
- `AI_AUTOSTART_ENABLED=false`
- `FORCE_ADMIN_RESET_ON_STARTUP=false`

Set backend AI target URL (private networking):

- `AI_SERVICE_URL=http://${{ai-service.RAILWAY_PRIVATE_DOMAIN}}/predict`

If your Railway UI uses a different variable reference helper, select the AI service private domain from the variable picker and append `/predict`.

### AI service variables

- `AI_SERVICE_API_KEY=<same-shared-secret-as-backend>`
- `ALLOW_UNSAFE_NO_API_KEY=false`

## 4) Deploy Order

1. Deploy `ai_service` first
2. Deploy `backend` second
3. Verify backend can call AI by testing forecast endpoint

## 5) Health Checks

- Backend: `GET https://<backend-domain>/health`
  - Expected: `{"status":"ok","service":"backend"}`
- AI service (private) can be checked from backend logs/forecast call

## 6) Mobile App Cloud Connection

In `mobile/.env` set:

`EXPO_PUBLIC_API_BASE_URL=https://<backend-domain>`

Then restart mobile bundler:

`npx expo start -c`

## 7) Smoke Test Flow

1. Open mobile app
2. Login
3. Load product catalog
4. Create/update inventory
5. Create product promotion
6. Run forecast generation (validates backend -> AI path)

## 8) Notes

- `backend/services/aiService.js` supports both:
  - explicit `AI_SERVICE_URL`
  - host-based fallback via `AI_SERVICE_HOST`
- On Railway, prefer `AI_SERVICE_URL` with private domain.
