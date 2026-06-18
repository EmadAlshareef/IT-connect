# IT Connect SQL Server Schema — v2 → v3 Changelog

**Script:** `ITConnect_SQLServer_FullSetup_v3.sql`  
**Database:** `ITConnectDb_v3` (fresh deploy; script drops/recreates on each run)

## Summary

v3 is a production-oriented evolution of v2: normalized lookups, audit/soft-delete columns, stronger constraints, and compatibility views so existing API shapes can be preserved during migration.

---

## Changes

### Lookup tables (new)
- `RefStatuses` — domain-scoped status codes (Enrollment, Training, Task, Post, etc.)
- `RefNotificationTones` — notification tone enum
- `RefCourseCategories` — training category codes
- `RefTags` + `CompanyPostTags` — replaces comma-separated `CompanyPosts.Tags`

### Denormalization removed (compat via views)
| v2 column(s) | v3 approach |
|---|---|
| `*LegacyId` on child tables | Only `AspNetUsers.LegacyUserId` retained; views expose legacy slugs |
| `EnrollmentApplications`: UserEmail, UserName, CourseTitle, Trainer* | `vw_EnrollmentApplications_Detail` joins users + trainings |
| `Trainings`: TrainerEmail, TrainerName, TrainerLegacyId, TrainerInitials | `vw_Trainings_Detail` |
| `Tracks.TrainingsCount`, `StudentsCount` | `vw_TrackStats` (computed) |
| `TrainingSections.TasksCount` | `vw_SectionStats` |
| `CompanyPosts.ApplicantsCount`, `Tags` | `vw_CompanyPosts_Detail` |
| `Tasks.SubmissionStatus` (string) | `StatusId` FK + `vw_Tasks_Detail` |
| `PortalNotifications.UserLegacyId`, `CourseTitle` | `vw_PortalNotifications_Detail` |
| `TraineeEvaluations.PendingCount` | `vw_TraineeEvaluations_Detail` |
| `TrainerFeedback.TaskTitle`, `TrainerName` | `TaskId` FK + `vw_TrainerFeedback_Detail` |
| `AspNetUsers.TrainerLegacyId` | Removed; use `AssignedTrainerUserId` + join |

### Status columns → FK
- `Trainings.Status` → `StatusId`
- `TrainingSections.Status` → `StatusId`
- `EnrollmentApplications.Status` → `StatusId`
- `Tasks.SubmissionStatus` → `StatusId`
- `CompanyPosts.Status` → `StatusId`
- `JobApplicants.Status` → `StatusId`
- `InternshipApplications.Status` → `StatusId`
- `EvaluationTaskItems.Status` → `StatusId`
- `PortalNotifications.Tone` → `ToneCode` FK

### Audit & concurrency (new on business tables)
- `CreatedAtUtc`, `UpdatedAtUtc` (where applicable)
- `CreatedByUserId`, `UpdatedByUserId` on `Trainings`
- `RowVersion` on mutable entities
- `IsDeleted`, `DeletedAtUtc` on users, catalog, tasks, enrollments, posts, internships

### Integrity
- `CK_Trainings_Seats` — seats taken ≤ total
- `CK_SectionEnrollments_Progress` — 0–100
- `CK_SectionEnrollments_Tasks` — completed ≤ total
- `CK_Messages_DifferentUsers` — no self-messages
- `CK_InternshipPrograms_Dates` — close > open
- `CK_RefreshTokens_Expiry`
- Filtered unique: `UX_Enrollment_ActiveStudentCourse` (one pending/approved per student+course)

### Indexes (added / improved)
- Composite: `(TrainerUserId, StatusId)`, `(UserId, IsRead, CreatedAtUtc DESC)`, `(StudentUserId, DeadlineUtc)`
- Filtered unique indexes on `LegacyUserId`, `NormalizedUserName` where `IsDeleted = 0`
- FK covering indexes on all relationship columns

### Relationships strengthened
- `TrainerFeedback.TaskId` → `Tasks.Id` (was free-text `TaskTitle` only)
- `JobApplicants.ApplicantUserId` → `AspNetUsers.Id` (optional, for registered applicants)

### Unchanged (by design)
- ASP.NET Identity table shapes
- Stable seed user GUIDs
- `Tasks.LastSubmissionId` pointer (indexed, no FK — avoids SQL Server cycle; trigger clears on submission delete)
- `__EFMigrationsHistory` seed row

### SQL Server deployment fixes (v3.1)
- `AspNetUserRoles` / `AspNetUserTokens` / `SectionEnrollments`: `PRIMARY KEY NONCLUSTERED` (900-byte clustered key limit)
- `Trainings` user FKs (`TrainerUserId`, `CreatedBy`, `UpdatedBy`): all `ON DELETE NO ACTION` (no multiple cascade paths)
- `Messages`: split composite index (avoid 1700-byte NC index limit)
- Seed: explicit column lists for `Branches`, `SectionEnrollments`

---

## Risk notes

1. **Column renames** — Any code reading `Status`, `SubmissionStatus`, `Category`, `Tone` directly from tables must switch to views or join `RefStatuses` / lookup tables.
2. **INSERT statements** — Must use `StatusId` / `CategoryCode` instead of string enums; seed in v3 script is the reference.
3. **Filtered unique enrollment** — Second pending/approved application for same student+course will fail; aligns with business rule but may reject duplicate test data.
4. **Soft delete** — Queries against base tables must filter `IsDeleted = 0`; views already do this where applicable.
5. **RowVersion** — EF/API updates must handle optimistic concurrency or ignore `RowVersion` until wired.
6. **ApplicantsCount in view** — v3 counts by `BranchId` (same as v2 seed behavior); tighten to post-specific count when `JobApplicants` gains `PostId` FK.
7. **Drop & recreate** — Script drops all tables; not an in-place migration. Use for fresh deploy or plan a separate ALTER migration for production data.

---

## Migration path (recommended)

1. Deploy v3 on a fresh `ITConnectDb` (or staging).
2. Point read APIs at `vw_*_Detail` views first.
3. Update write paths to normalized columns + lookups.
4. Add EF entities matching v3 tables.
5. After API cutover, drop views only if DTOs no longer need legacy field names.
