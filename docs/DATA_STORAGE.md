# Data Storage — Training Sphere

## Overview

The project uses **two storage layers**:

1. **Frontend `localStorage`** — most Admin / Company / Catalog data
2. **Backend files + in-memory** — enrollment applications, tasks, messages (partially)

**There is no SQL database yet.** Entity Framework is planned under `backend/Student/` but not enabled.

---

## Frontend localStorage keys

### Auth & members

| Key | Purpose | File |
|-----|---------|------|
| `trainer-auth` | JWT + session user | `AuthContext.jsx` |
| `itconnect_registered_members_v1` | Member roster | `useRegisteredMembers.js` |
| `itconnect_member_credentials_v1` | Password hashes (demo) | `useRegisteredMembers.js` |
| `it-connect-theme` | Dark/light mode | `themeUtils.js` |

### Admin

| Key | Purpose | File |
|-----|---------|------|
| `itconnect_admin_created_trainings_v1` | Published trainings by branch | `useAdminCreatedTrainings.js` |
| `itconnect_admin_created_tracks_v1` | Track catalog | `useAdminCreatedTracks.js` |
| `itconnect_admin_track_skills_v1` | Skills per track | `useAdminTrackSkills.js` |
| `itconnect_trainer_track_assignments_v1` | Admin trainer ↔ track links | `AdminDashboard.jsx` |
| `itconnect_platform_default_tracks_v1` | Default track options | `platformDefaultTracks.js` |

### Company

| Key | Purpose | File |
|-----|---------|------|
| `itconnect_company_profiles_v1` | Company profile cards | `useCompanyProfiles.js` |
| `itconnect_company_trainers_v1` | Trainers roster | `useCompanyTrainers.js` |
| `itconnect_company_training_requests_v1` | Training publish requests | `useCompanyTrainingRequests.js` |
| `itconnect_company_track_requests_v1` | Custom track requests | `useCompanyTrackRequests.js` |
| `itconnect_company_post_requests_v1` | Company posts | `useCompanyPostRequests.js` |
| `itconnect_company_selected_tracks_v1` | Selected tracks per company | `companySelectedTracks.js` |

### Enrollment & catalog

| Key | Purpose | File |
|-----|---------|------|
| `ts-enrollment-applications-v1` | Applications (local fallback) | `enrollmentApplicationApi.js` |
| `ts-catalog-training-enrollments-{userId}` | Per-user catalog enrollments | `trainingCatalogEnrollment.js` |
| `ts-portal-notifications-{userId}` | User notifications | `enrollmentApplicationApi.js` |
| `ts-student-active-course` | Active course context | `useStudentApprovedCourses.js` |

### Trainer / student workspace

| Key | Purpose | File |
|-----|---------|------|
| `ts-trainer-topic-docs-index-v1` | Topic doc index | `topicDocumentationStorage.js` |
| `ts-trainer-topic-doc-{id}` | Individual topic records | `topicDocumentationStorage.js` |
| `ts-trainer-task-requests` | Task approval requests | `taskApprovalRequests.js` |
| `ts-trainer-dashboard-task-drafts` | Legacy task drafts | `taskApprovalRequests.js` |
| `role-based-messages` | Direct messages | `messageApi.js` |
| `ts-ai-tutor-{userId}-{branchId}-{courseId}` | AI chat history | `aiLearningApi.js` |
| `itconnect_student_github_submissions_v1` | GitHub submissions | `studentGithubSubmissions.js` |

---

## Backend file storage

| Path | Purpose |
|------|---------|
| `backend/App_Data/enrollment-applications.json` | Enrollment records |
| `backend/wwwroot/uploads/enrollment-cvs/` | Uploaded CV files |

---

## Backend in-memory (lost on restart)

| Service | Data |
|---------|------|
| `AuthService` | Static demo users |
| `MessageService` | Messages |
| `TaskRepository` | Tasks |
| `SubmissionRepository` | Submissions |
| `InternshipService` | Internships |
| `FeedbackService` | Feedback |
| `UserDirectoryService` | User directory |

---

## Database migration roadmap

### Phase 1 — Foundation

```sql
-- Tables (simplified)
Users (Id, Email, PasswordHash, Role, Name)
Branches (Id, Name)
Tracks (Id, BranchId, Title, Description)
Trainings (Id, BranchId, TrackId, Title, SeatsTotal, Status, TrainerEmail…)
```

**Tools:** EF Core + SQL Server LocalDB or PostgreSQL

**Steps:**
1. `dotnet add package Microsoft.EntityFrameworkCore.SqlServer`
2. Create `AppDbContext`
3. Add connection string to `appsettings.json`
4. `dotnet ef migrations add InitialCreate`
5. `dotnet ef database update`

### Phase 2 — Enrollment (replace JSON)

Migrate `EnrollmentApplicationService` from `App_Data/*.json` to DB table `EnrollmentApplications`.

Frontend: keep API contract; remove `ts-enrollment-applications-v1` fallback gradually.

### Phase 3 — Company & Admin catalog

Replace localStorage keys:
- `itconnect_company_*`
- `itconnect_admin_*`

Add API controllers:
- `CompanyTrainingsController`
- `AdminCatalogController`

### Phase 4 — Tasks, messages, topics

Move to DB + blob storage for attachments.

---

## Existing SQL schemas (reference)

Pre-written schemas in repo (not wired to app yet):

- `docs/student-module/database/schema.sql`
- `docs/student-module/database/enrollment-applications.sql`

Full ER design: `docs/student-module/STUDENT_MODULE.md`

---

## Recommended connection string

**SQL Server LocalDB (Windows dev):**
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=TrainingSphere;Trusted_Connection=True;TrustServerCertificate=True;"
}
```

**PostgreSQL:**
```json
"DefaultConnection": "Host=localhost;Database=training_sphere;Username=postgres;Password=yourpassword"
```

**Register in Program.cs:**
```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
```

---

## Data sync notes

- **Same browser only:** localStorage is per-origin; not shared across devices
- **Clear demo data:** DevTools → Application → Local Storage → delete `itconnect_*` / `ts-*`
- **Cross-tab sync:** many hooks listen to `window.storage` event
- **Backend optional:** frontend demo works fully offline for most admin/company flows

---

## Priority migration order

| # | Domain | Current | Target |
|---|--------|---------|--------|
| 1 | Users / Auth | Static + localStorage | `Users` table + JWT |
| 2 | Trainings catalog | localStorage | `Trainings` + API |
| 3 | Enrollments | JSON file + localStorage | DB (partially designed) |
| 4 | Company trainers/requests | localStorage | DB + API |
| 5 | Tasks / messages / topics | Mixed | DB + blob storage |
