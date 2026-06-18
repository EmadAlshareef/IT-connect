# Training Sphere — Documentation

Welcome to the **Training Sphere** (IT Connect) project documentation.

## Documentation index

| File | Contents |
|------|----------|
| [PROJECT.md](./PROJECT.md) | **Main project doc** — overview, roles, features, structure |
| [SETUP.md](./SETUP.md) | Installation & run (Frontend + Backend) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture, data flow, auth |
| [API.md](./API.md) | REST API reference |
| [DATA_STORAGE.md](./DATA_STORAGE.md) | localStorage, JSON files, database roadmap |
| [EVENT_FLOWS.md](./EVENT_FLOWS.md) | **Event sequences & user roles** — full platform flows (English) |
| [student-module/STUDENT_MODULE.md](./student-module/STUDENT_MODULE.md) | Detailed student module design |

## Quick overview

```
secratchd/
├── frontend/          React + Vite + Tailwind
├── backend/           ASP.NET Core 8 Web API
└── docs/              this folder
```

- **Frontend:** `http://localhost:5173` (or another port printed by Vite)
- **Backend API:** `http://localhost:5114/api`
- **Swagger (Development):** `http://localhost:5114/swagger`

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin123@gmail.com` | `admin123` |
| Trainer | `trainer2003@gmail.com` | `trainer2003` |
| Student | `mohamed.ali@example.com` | `student123` |

> Login works **without the backend** for static demo accounts (offline mode).

## Quick start

```powershell
# Terminal 1 — Backend
cd backend
dotnet restore
dotnet run

# Terminal 2 — Frontend
cd frontend
copy .env.example .env
npm install
npm run dev
```

For full details see [SETUP.md](./SETUP.md).
