# API Reference — Training Sphere

Base URL: `http://localhost:5114/api`  
Auth header (protected routes): `Authorization: Bearer <token>`

Swagger UI (Development): `http://localhost:5114/swagger`

---

## Auth

### `POST /auth/login`

**Body:**
```json
{
  "email": "trainer2003@gmail.com",
  "password": "trainer2003"
}
```

**Response (200):**
```json
{
  "token": "<jwt>",
  "user": {
    "id": "trainer-2003",
    "email": "trainer2003@gmail.com",
    "name": "Trainer User",
    "role": "Trainer"
  }
}
```

---

## Enrollment Applications

Controller: `EnrollmentApplicationsController`  
Auth: `[Authorize]`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/EnrollmentApplications/me` | Student | List my applications |
| GET | `/EnrollmentApplications/access?branchId=&courseId=` | Student | Course access decision |
| GET | `/EnrollmentApplications/me/course?branchId=&courseId=` | Student | Application for one course |
| POST | `/EnrollmentApplications` | Student | Submit application (multipart: CV file) |
| GET | `/EnrollmentApplications/trainer` | Trainer | Pending applications for trainer |
| GET | `/EnrollmentApplications/trainer/{id}` | Trainer | Single application |
| POST | `/EnrollmentApplications/trainer/{id}/approve` | Trainer | Approve |
| POST | `/EnrollmentApplications/trainer/{id}/reject` | Trainer | Reject |
| GET | `/EnrollmentApplications/notifications` | Any | User notifications |
| GET | `/EnrollmentApplications/notifications/unread-count` | Any | Unread count |
| POST | `/EnrollmentApplications/notifications/{id}/read` | Any | Mark read |
| POST | `/EnrollmentApplications/notifications/application/{applicationId}/read` | Any | Mark by application |

**Persistence:** `backend/App_Data/enrollment-applications.json`

---

## Messages

Controller: `MessagesController`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/Messages/{userId}` | Get conversation for user |
| POST | `/Messages/send` | Send message |

---

## Tasks & Submissions

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/Tasks/me` | Student | Assigned tasks |
| GET | `/Submission/me` | Student | My submissions |
| POST | `/Submission/task` | Student | Submit task work |

---

## Student Dashboard

Controller: `StudentDashboardController`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/StudentDashboard/stats` | Dashboard statistics |
| GET | `/StudentDashboard/feedback` | Feedback list |
| GET | `/StudentDashboard/progress` | Progress summary |

---

## Internships

Controller: `InternshipsController`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/Internships/programs` | Published programs |
| GET | `/Internships/applications/me` | My internship applications |
| POST | `/Internships/applications` | Submit application |

---

## Learning Assistant (AI Tutor)

Controller: `LearningAssistantController`

### `POST /LearningAssistant/chat`

**Body:**
```json
{
  "message": "Explain React hooks",
  "branchId": "branch-1",
  "courseId": "course-1",
  "courseTitle": "Frontend Dev",
  "studentName": "Mohamed",
  "history": [{ "role": "user", "content": "..." }]
}
```

**Query params:** `branchId`, `courseId` (optional duplicates)

Requires OpenAI key in `appsettings.json` for live responses.

---

## GitHub

Controller: `GithubController`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/Github/validate` | Validate GitHub repository URL |

---

## Frontend API clients

| File | Backend endpoints used |
|------|------------------------|
| `frontend/src/api/authApi.js` | `/auth/login` |
| `frontend/src/api/enrollmentApplicationApi.js` | `/EnrollmentApplications/*` |
| `frontend/src/api/messageApi.js` | `/Messages/*` + localStorage fallback |
| `frontend/src/api/studentPortalApi.js` | Student dashboard, tasks, submissions |
| `frontend/src/api/aiLearningApi.js` | `/LearningAssistant/chat` |

---

## Error handling

| Status | Meaning |
|--------|---------|
| 400 | Validation error (missing branchId/courseId…) |
| 401 | Missing or invalid JWT |
| 403 | Wrong role |
| 500 | Server error |

Frontend axios interceptor sets `preferLocalPortalData = true` on 401/403/5xx/network errors → falls back to localStorage where implemented.

---

## Endpoints not yet implemented (localStorage only)

These features exist in UI but **have no dedicated Backend API** yet:

- Admin catalog (tracks, trainings, branches)
- Company trainers & training requests
- Company profiles & members
- Topic documentation
- Admin member management
- Catalog seat counts (client-side only)

See [DATA_STORAGE.md](./DATA_STORAGE.md) for migration plan.
