# Setup Guide — Training Sphere

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| .NET SDK | 8.0+ |
| Modern browser | Chrome / Edge / Firefox |

Optional:
- SQL Server LocalDB or PostgreSQL (next phase — database)
- OpenAI API key (AI Tutor feature)

---

## 1. Frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open the URL Vite prints, usually:
- `http://localhost:5173`

If the port is in use:
- `http://localhost:5174` or higher

### `.env` file

```env
VITE_API_BASE_URL=http://localhost:5114/api
```

### Additional commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Production build → `frontend/dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## 2. Backend

```powershell
cd backend
dotnet restore
dotnet run
```

### Run URLs

| Protocol | URL |
|----------|-----|
| HTTP | `http://localhost:5114` |
| HTTPS | `https://localhost:7114` |
| Swagger | `http://localhost:5114/swagger` (Development only) |
| API root | `http://localhost:5114/api` |

### JWT configuration

In `backend/appsettings.json`:

```json
"Jwt": {
  "Issuer": "TrainerPortal",
  "Audience": "TrainerPortalClient",
  "Key": "ThisIsASuperSecretDevelopmentKey12345!"
}
```

> **Production:** change `Key` to a long random value and store it in secrets/environment variables.

### CORS

The backend allows these origins:
- `http://localhost:5173` – `5175`
- `http://127.0.0.1:5173` – `5175`
- `http://localhost:4173` (Vite preview)

If the frontend runs on a different port, add it in `Program.cs` → `FrontendPolicy`.

---

## 3. Run the full stack

**Terminal 1:**
```powershell
cd backend
dotnet run
```

**Terminal 2:**
```powershell
cd frontend
npm run dev
```

1. Open the frontend URL
2. Sign in with a demo account (see below)
3. Confirm network requests go to `:5114/api` when using API features

---

## 4. Demo accounts

### Works without backend (offline demo)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin123@gmail.com` | `admin123` |
| Trainer | `trainer2003@gmail.com` | `trainer2003` |
| Trainer | `trainer2000@gmail.com` | `trainer2000` |
| Student | `mohamed.ali@example.com` | `student123` |
| Student | `sara.ahmed@example.com` | `student123` |
| Student | `hassan@example.com` | `student123` |

### With backend

Same accounts above + JWT from `POST /api/auth/login`.

### Register a new account

`/register` → saved to `itconnect_registered_members_v1` in localStorage.

---

## 5. AI Tutor (optional)

In `backend/appsettings.json`:

```json
"Ai": {
  "OpenAiApiKey": "sk-...",
  "OpenAiModel": "gpt-4o-mini",
  "OpenAiBaseUrl": "https://api.openai.com/v1/"
}
```

Without a key: responses come from a local fallback in the frontend.

---

## 6. Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | Ensure backend is running + correct origin |
| 401 on API | Sign in again; check JWT |
| Data not showing | Much data lives in `localStorage` — clear cache or use DevTools → Application |
| Port in use | Vite picks another port automatically; read terminal output |
| `dotnet run` fails | Verify .NET 8 SDK: `dotnet --version` |

### Clear demo data

DevTools → Application → Local Storage → delete `itconnect_*` and `ts-*` keys to reset seed data.

---

## 7. Production build

```powershell
# Frontend
cd frontend
npm run build
# Output: frontend/dist/

# Backend
cd backend
dotnet publish -c Release -o ./publish
```

Deploy frontend static files to Nginx/Vercel/Netlify.  
Backend requires a host that supports ASP.NET Core 8.
