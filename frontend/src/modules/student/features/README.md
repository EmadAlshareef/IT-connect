# Student feature folders (target layout)

Migrate pages from `src/pages/student/` into feature slices:

```
features/
  auth/           → register, login hooks (shared with /register, /login)
  dashboard/      → home, stats, activity, celebrate
  internships/    → browse, detail, filters
  applications/   → list, timeline, apply wizard
  tasks/          → assigned task list
  submissions/    → submit form (file | link | github)
  feedback/       → grades list
  progress/       → charts
  profile/        → settings form
```

Each feature exports:
- `components/`
- `hooks/` (React Query)
- `schemas/` (Zod validation)
