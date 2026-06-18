# Training Sphere — Project Documentation

## 1. Overview

**Training Sphere** (IT Connect) is a platform for managing training programs and internships. It connects:

- **Students** — browse programs, apply, complete tasks, receive evaluations, earn credentials
- **Trainers** — manage assigned programs, tasks, submissions, and student acceptance
- **Companies** — publish trainings, assign trainers, manage members and applicants
- **Administrators** — manage branches, tracks, catalog, approvals, and members

### Tech stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS, Axios, Framer Motion |
| Backend | ASP.NET Core 8, JWT Bearer Auth, Swagger |
| Current storage | `localStorage` (Frontend) + JSON files in `App_Data` (Backend) |
| Planned storage | SQL Server / PostgreSQL + Entity Framework Core |

---

## 2. Project structure

```
secratchd/
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios clients (auth, enrollment, messages, AI…)
│   │   ├── components/       # Shared UI + admin + company + trainer + student
│   │   ├── context/          # Auth, Theme, AdminNav
│   │   ├── data/             # Seed data (sessions, admin dashboard)
│   │   ├── hooks/            # localStorage hooks (company, admin, members…)
│   │   ├── pages/            # Route pages
│   │   ├── utils/            # Business logic helpers
│   │   └── App.jsx           # Router
│   └── .env.example          # VITE_API_BASE_URL
│
├── backend/
│   ├── Controllers/          # REST endpoints
│   ├── Services/             # Business logic + JSON persistence
│   ├── Models/               # DTOs
│   ├── Student/              # Student module (domain entities — EF pending)
│   ├── App_Data/             # enrollment-applications.json (runtime)
│   └── Program.cs
│
└── docs/                     # Documentation
```

---

## 3. Roles and routes

### 3.1 Public pages

| Route | Description |
|-------|-------------|
| `/` | Home (Hero, Features, How it works, Roles, Stats) |
| `/services` | Training catalog |
| `/services/training/:branchId/:trainingId` | Training details + enroll button |
| `/companies` | Companies page |
| `/contact` | Contact |
| `/login` | Sign in |
| `/register` | Create account (demo → localStorage) |

### 3.2 Admin

| Route | Description |
|-------|-------------|
| `/admin` | Admin dashboard |
| `/admin/track/:trackId` | Track details |

**Admin tabs:** Overview · Tracks · Trainings · Trainers · Members · Companies · Posts · Applicants

### 3.3 Company

| Route | Description |
|-------|-------------|
| `/company/dashboard` | Company dashboard |

**Company tabs:** Overview · Profile · Tracks · Trainings · Trainers · Posts · Applicants

### 3.4 Trainer

| Route | Description |
|-------|-------------|
| `/dashboard` | Trainer dashboard (workspace sidebar) |
| `/dashboard/section/:sectionId` | Training session details |
| `/dashboard/evaluations` | Evaluations |
| `/dashboard/evaluate/:traineeId` | Evaluate a trainee |
| `/messages` | Direct messages |

**Trainer tools:** Enrolled students · Messages · Create tasks · My tasks · Task submissions · GitHub · Enrollment requests · Topic documentation

> The trainer sidebar shows **only trainings assigned by the company** (`trainerEmail` on company requests).

### 3.5 Student

| Route | Description |
|-------|-------------|
| `/student/applications` | My applications (default landing) |
| `/student/internships` | Available trainings |
| `/student/enrollment/application` | Application form |
| `/student/enrollment/status` | Application status |
| `/student/tasks` | Tasks |
| `/student/topics` | Topics / learning content |
| `/student/ai-tutor` | AI tutor |
| `/student/submit` | Submit task |
| `/student/github` | GitHub |
| `/student/feedback` | Feedback |
| `/student/profile` | Profile |
| `/student/messages` | Messages |

---

## 4. Key features

### 4.1 Training catalog & seats

- Admin publishes trainings per branch (`itconnect_admin_created_trainings_v1`)
- Live seat display: `seatsTaken / seatsTotal`
- Enrolling reserves a seat (`catalogTrainingSeats.js`, `trainingCatalogEnrollment.js`)

### 4.2 Enrollment applications

- Student submits an application with CV
- Trainer reviews and approves/rejects
- Backend: `EnrollmentApplicationsController` + `App_Data/enrollment-applications.json`
- Frontend: falls back to `localStorage` when API is unavailable

### 4.3 Companies & trainers

- Company adds trainers (`itconnect_company_trainers_v1`)
- Company creates training request (`itconnect_company_training_requests_v1`)
- Admin approves → published to catalog
- Admin edits trainer track assignments (Your trainers / Company trainers)

### 4.4 Tasks & submissions

- Trainer creates tasks → student submits work
- Backend: `TasksController`, `SubmissionController`
- Rubric-based evaluation + feedback

### 4.5 Topic documentation

- Trainer publishes learning content (text, video, files)
- Stored in `localStorage` (`topicDocumentationStorage.js`)

### 4.6 AI tutor

- `POST /api/LearningAssistant/chat`
- Local fallback when no OpenAI key is configured

### 4.7 Messages

- `MessagesController` + `messageApi.js`
- Local storage: `role-based-messages`

---

## 5. Authentication

### Login flow

1. User enters email/password on `/login`
2. Frontend sends `POST /api/auth/login`
3. On success: JWT + user stored in `localStorage` (`trainer-auth`)
4. Redirect by role: Admin → `/admin`, Student → `/student/...`, Trainer → `/dashboard`, Company → `/company/dashboard`

### Offline demo mode

If the backend is down or the request fails:

- `authApi.js` checks static accounts + `itconnect_registered_members_v1`
- Admin: `admin123@gmail.com` / `admin123`
- Other roles from static roster or registered members

### JWT (backend)

- Issuer/Audience/Key in `backend/appsettings.json`
- Controllers protected with `[Authorize]` and `[Authorize(Roles = "...")]`

---

## 6. Custom events

| Event | Purpose |
|-------|---------|
| `admin-created-trainings` | Refresh catalog after admin creates a training |
| `CATALOG_ENROLLMENT_CHANGED_EVENT` | Refresh seat statistics |
| `registered-members-changed` | Sync user role |
| `company-trainers-changed` | Refresh trainer roster |

---

## 7. Environment variables

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5114/api
```

### Backend (`backend/appsettings.json`)

```json
{
  "Jwt": { "Issuer": "...", "Audience": "...", "Key": "..." },
  "Ai": { "OpenAiApiKey": "", "OpenAiModel": "gpt-4o-mini" }
}
```

---

## 8. Current development status

| Feature | Frontend | Backend | DB |
|---------|----------|---------|-----|
| Login / JWT | ✅ | ✅ | ❌ static |
| Enrollment applications | ✅ hybrid | ✅ JSON file | ❌ |
| Training catalog | ✅ localStorage | ❌ | ❌ |
| Company workflows | ✅ localStorage | ❌ | ❌ |
| Admin dashboard | ✅ localStorage + seed | ❌ | ❌ |
| Tasks / Submissions | ✅ hybrid | ✅ in-memory | ❌ |
| Messages | ✅ localStorage | ✅ in-memory | ❌ |
| AI Tutor | ✅ | ✅ (OpenAI optional) | ❌ |

**Recommended next step:** Add Entity Framework + SQL Server/PostgreSQL and migrate `localStorage` data to the API gradually. See [DATA_STORAGE.md](./DATA_STORAGE.md).

---

## 9. Useful commands

```powershell
# Frontend
cd frontend
npm install
npm run dev          # development
npm run build        # production build
npm run lint         # ESLint

# Backend
cd backend
dotnet restore
dotnet run           # http://localhost:5114
dotnet build
```

---

## 10. Important reference files

| File | Purpose |
|------|---------|
| `frontend/src/App.jsx` | All routes |
| `frontend/src/api/authApi.js` | Auth + API client |
| `frontend/src/context/AuthContext.jsx` | Session state |
| `frontend/src/utils/trainerCompanyWorkspace.js` | Trainer sessions from company data |
| `frontend/src/hooks/useRegisteredMembers.js` | Member roster |
| `backend/Program.cs` | DI + CORS + JWT |
| `backend/Services/EnrollmentApplicationService.cs` | Enrollment applications |

---

## 11. Event flows

For **how the sequence progresses** (phases, gates, status changes, UI triggers):

**[EVENT_FLOWS.md](./EVENT_FLOWS.md)** — start with [How the sequence works](./EVENT_FLOWS.md#how-the-sequence-works), then the full cross-role diagram.

---

## 12. Further reading

- [SETUP.md](./SETUP.md) — installation
- [API.md](./API.md) — REST endpoints
- [ARCHITECTURE.md](./ARCHITECTURE.md) — diagrams
- [EVENT_FLOWS.md](./EVENT_FLOWS.md) — event sequences
- [DATA_STORAGE.md](./DATA_STORAGE.md) — storage & database plan
- [student-module/STUDENT_MODULE.md](./student-module/STUDENT_MODULE.md) — student module design
