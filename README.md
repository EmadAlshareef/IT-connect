# Training Sphere

Full-stack training & internship management platform — React + ASP.NET Core.

## Quick start

```powershell
# Backend
cd backend && dotnet run

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

Frontend: `http://localhost:5173` · API: `http://localhost:5114/api`

## Demo login

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin123@gmail.com` | `admin123` |
| Trainer | `trainer2003@gmail.com` | `trainer2003` |
| Student | `mohamed.ali@example.com` | `student123` |

Works **without backend** for demo accounts (localStorage mode).

## Documentation

Full project documentation is in **[docs/](./docs/)**:

| Doc | Description |
|-----|-------------|
| [docs/README.md](./docs/README.md) | Documentation index |
| [docs/PROJECT.md](./docs/PROJECT.md) | **Main project doc** — features, routes, roles |
| [docs/SETUP.md](./docs/SETUP.md) | Installation & troubleshooting |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture & data flows |
| [docs/API.md](./docs/API.md) | REST API reference |
| [docs/EVENT_FLOWS.md](./docs/EVENT_FLOWS.md) | Event sequences & workflows |
| [docs/DATA_STORAGE.md](./docs/DATA_STORAGE.md) | localStorage keys & database roadmap |

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS, React Router, Axios
- **Backend:** ASP.NET Core 8, JWT, Swagger
- **Storage (current):** localStorage + JSON files (DB planned)

## Project structure

```
secratchd/
├── frontend/     React SPA
├── backend/      ASP.NET Web API
└── docs/         Project documentation
```
