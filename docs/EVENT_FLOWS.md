# Event Flows & User Roles — Training Sphere

This document maps **every event sequence** to the **user role** that performs it — who does what, where in the UI, and what other roles see afterward.

> Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md) · Storage: [DATA_STORAGE.md](./DATA_STORAGE.md)

---

## How the sequence works

Training Sphere runs as a **chain of handoffs** between roles. Each step **unblocks** the next. Nothing skips ahead unless the previous gate is passed.

### Three phases

```mermaid
flowchart LR
  subgraph P1["Phase 1 — Setup"]
    A1[Company adds trainer]
    A2[Company creates training]
    A3[Admin approves]
    A4[Catalog published]
    A1 --> A2 --> A3 --> A4
  end

  subgraph P2["Phase 2 — Enrollment"]
    B1[Student enrolls]
    B2[Seat reserved]
    B3[Application submitted]
    B4[Trainer approves]
    B1 --> B2 --> B3 --> B4
  end

  subgraph P3["Phase 3 — Delivery"]
    C1[Trainer creates tasks]
    C2[Student submits]
    C3[Trainer evaluates]
    C4[Student sees feedback]
    C1 --> C2 --> C3 --> C4
  end

  P1 --> P2 --> P3
```

| Phase | Goal | Who drives it | Ends when |
|-------|------|---------------|-----------|
| **1 — Setup** | Training exists in the public catalog with an assigned trainer | Company + Admin | Training visible on `/services` and in trainer sidebar |
| **2 — Enrollment** | Student is accepted into that training | Student + Trainer | Trainer approves application → student workspace opens |
| **3 — Delivery** | Day-to-day learning loop | Trainer + Student | Tasks assigned, submitted, graded (repeats) |

---

### The flow step by step (plain language)

**Phase 1 — Company prepares, Admin publishes**

1. **Company** adds a **trainer** to its roster (name + email + tracks).
2. **Company** creates a **training request** — title, dates, seats, track, and **`trainerEmail`** (who will run it).
3. Request is saved as **`PENDING`**. The **trainer** already sees it in the sidebar as *Pending approval* (not public yet).
4. **Admin** reviews the queue and clicks **Approve**.
5. System **copies** the training into the branch catalog (`admin_created_trainings`) and marks the request **`APPROVED`**.
6. **Now:** training appears on **`/services`**, admin seat stats update, trainer sidebar shows *Active*.

> **Gate:** Student cannot enroll until step 5–6 (catalog live).  
> **Alternate path:** Admin can create a training **directly** (skip company request) — still appears on `/services`, but trainer only sees it if assigned via a company request.

---

**Phase 2 — Student joins, Trainer accepts**

7. **Student** (or guest → login) opens the training on **`/services`** and clicks **Enroll**.
8. System checks **seat availability** → reserves one seat → `seatsTaken` increases.
9. Student is redirected to **`/student/enrollment/application`** → fills form + uploads CV.
10. Application saved as **`pending`**. **Trainer** gets a notification and sees it under **Accept new students**.
11. **Trainer** clicks **Approve** (or Reject with reason).
12. If approved: student **`/student/tasks`** and related pages **unlock**. If rejected: student sees rejection on status page.

> **Gate:** Student workspace stays locked until step 11 (trainer approval).  
> **Gate:** Enroll (step 7) requires a free seat — blocked if full.

---

**Phase 3 — Training runs (repeating loop)**

13. **Trainer** creates a **task brief** on `/dashboard` → assigns it to students in the section workspace.
14. **Student** completes work → submits on **`/student/submit`**.
15. **Trainer** opens **Task Submissions** → grades + writes feedback.
16. **Student** reads feedback on **`/student/feedback`**. Trainer may publish **topics** on `/student/topics`.

> This loop (13 → 16) repeats for each task. It does **not** require Admin or Company again.

---

### Dependency diagram (what blocks what)

```mermaid
flowchart TD
  Start([Start]) --> T1{Trainer on company roster?}
  T1 -->|No| T1a[Company adds trainer]
  T1a --> T2
  T1 -->|Yes| T2{Training request created?}
  T2 -->|No| T2a[Company creates training]
  T2a --> T3
  T2 -->|Yes| T3{Admin approved?}
  T3 -->|No| Wait1[Trainer: Pending approval<br/>Student: not in catalog]
  T3 -->|Yes| T4[Catalog live on /services]
  T4 --> T5{Student enrolled + seat free?}
  T5 -->|No seat| Block1[Enroll blocked]
  T5 -->|Yes| T6{Application submitted?}
  T6 -->|No| T6a[Student fills application]
  T6a --> T7
  T6 -->|Yes| T7{Trainer approved?}
  T7 -->|No| Wait2[Student: pending status]
  T7 -->|Yes| T8[Student workspace open]
  T8 --> T9[Tasks loop: assign → submit → grade]
  T9 --> T9
```

---

### Status changes (what moves the sequence forward)

**Company training request** (`company_training_requests_v1`)

| Status | Meaning | Who can act next |
|--------|---------|------------------|
| `PENDING` | Waiting for admin | Admin → Approve / Reject |
| `APPROVED` | In catalog | Student → Enroll |
| `REJECTED` | Stopped | Company may create a new request |

**Student enrollment application**

| Status | Meaning | Who can act next |
|--------|---------|------------------|
| *(after Enroll, before form)* | Seat reserved, no application yet | Student → Submit application |
| `pending` | Awaiting trainer | Trainer → Approve / Reject |
| `approved` | Accepted | Student → Tasks; Trainer → Assign work |
| `rejected` | Denied | Student sees reason; no workspace |

---

### How the UI updates (without refresh)

When one role completes an action, **custom browser events** notify other screens:

```mermaid
flowchart LR
  Co[Company creates request] --> E1[company-training-requests]
  E1 --> AdUI[Admin queue updates]
  E1 --> TrUI[Trainer sidebar updates]

  Ad[Admin approves] --> E2[admin-created-trainings]
  E2 --> CatUI[/services catalog updates]

  St[Student enrolls] --> E3[ts-catalog-enrollment-changed]
  E3 --> SeatUI[Admin seat count updates]

  St2[Student submits application] --> E4[ts-enrollment-applications-changed]
  E4 --> TrInbox[Trainer inbox updates]

  Tr[Trainer approves] --> E4
  E4 --> StAccess[Student access gates open]
```

---

### One-page cheat sheet

```
SETUP:     Company → (trainer + training request) → Admin approves → Catalog
ENROLL:    Student Enroll → seat++ → Application → Trainer approves
DELIVER:   Trainer task → Student submit → Trainer grade → Student feedback
```

**Quick links:** [Full numbered sequence](#full-sequence--all-roles-together) · [Step table](#who-does-what-at-each-step) · [Per-role details](#index-by-role)

---

## Roles on the platform

| Role | `role` value | After login | Workspace | Owns |
|------|--------------|-------------|-----------|------|
| **Guest** | — | — | `/`, `/services`, `/login` | Browse catalog only |
| **Admin** | `admin` | `/admin` | Admin Dashboard | Branches, tracks, trainings, members, company approvals |
| **Company** | `company` | `/company/dashboard` | Company Dashboard | Company profile, trainers, training/track requests |
| **Trainer** | `trainer` | `/dashboard` | Trainer Workspace | **Company-assigned** trainings, tasks, evaluations, student acceptance |
| **Student** | `student` | `/student/applications` | Student Portal | Enroll, applications, tasks, topics, feedback |

```mermaid
flowchart TB
  subgraph Public["🌐 Public — no login"]
    H[Home / Services / Companies]
  end

  subgraph Admin["🔶 Admin"]
    AD["/admin"]
    AD --> AD1[Tracks · Trainings · Members]
    AD --> AD2[Approve company requests]
  end

  subgraph Company["🔷 Company"]
    CD["/company/dashboard"]
    CD --> CD1[Trainers · Trainings · Tracks]
    CD --> CD2[Applicants · Posts]
  end

  subgraph Trainer["🟣 Trainer"]
    TD["/dashboard"]
    TD --> TD1[Assigned trainings sidebar]
    TD --> TD2[Tasks · Enrollments · Evaluate]
  end

  subgraph Student["🔵 Student"]
    ST["/student/*"]
    ST --> ST1[Enroll · Application]
    ST --> ST2[Tasks · Topics · Submit]
  end

  Company -->|training request| Admin
  Admin -->|publish catalog| Public
  Admin -->|approve| Trainer
  Public -->|enroll| Student
  Student -->|application| Trainer
  Trainer -->|tasks & grades| Student
```

---

## Index by role

### Shared (all roles)
- [How the sequence works](#how-the-sequence-works) — **start here** (phases, gates, status changes)
- [Login & role routing](#1-login--role-routing)
- [Register new member](#2-register-new-member)
- [Full sequence — all roles](#full-sequence--all-roles-together)
- [Who does what at each step](#who-does-what-at-each-step)
- [System custom events](#13-system-custom-events)

### 🔶 Admin
- [Admin publishes training directly](#5-admin-publishes-training-directly)
- [Admin approves company training](#4-company--admin--catalog--trainer)
- [Admin approves company track request](#6-company--admin--custom-track-request)

### 🔷 Company
- [Company adds a trainer](#3-company-adds-a-trainer)
- [Company creates training request](#4-company--admin--catalog--trainer)
- [Company requests custom track](#6-company--admin--custom-track-request)

### 🟣 Trainer
- [Trainer sees assigned trainings](#9-trainer-sees-trainings-in-workspace)
- [Trainer approves enrollment](#8-trainer-approves-enrollment-application)
- [Trainer: tasks → evaluation](#10-trainer-creates-task--student-submits--evaluation)
- [Trainer publishes topics](#11-trainer-publishes-topic-documentation)

### 🔵 Student
- [Student enrolls & submits application](#7-student-enrolls-in-a-training)
- [Student submits task & reads feedback](#10-trainer-creates-task--student-submits--evaluation)
- [Student reads topics](#11-trainer-publishes-topic-documentation)

### Cross-role
- [Messages between roles](#12-messages-between-roles)

---

## Full sequence — all roles together

```mermaid
sequenceDiagram
  autonumber
  actor Co as 🔷 Company
  actor Ad as 🔶 Admin
  actor Tr as 🟣 Trainer
  actor St as 🔵 Student
  participant Cat as Catalog / Services
  participant LS as localStorage + API

  Note over Co,Ad: ─── Program setup ───
  Co->>LS: ① Add Trainer (company_trainers)
  Co->>LS: ② Create Training Request + trainerEmail
  Note over Co,LS: reviewStatus = PENDING

  Ad->>LS: ③ Approve training request
  Ad->>Cat: ④ Publish → admin_created_trainings
  Note over Tr,Cat: Trainer sees training in Sidebar

  Note over St,Tr: ─── Enrollment & acceptance ───
  St->>Cat: ⑤ Browse /services → Enroll
  St->>LS: ⑥ Reserve seat (catalog enrollments)
  St->>LS: ⑦ Submit Application + CV
  Note over St,LS: status = pending

  Tr->>LS: ⑧ Approve application
  Note over St: onboarding = approved → /student/tasks

  Note over Tr,St: ─── Day-to-day training ───
  Tr->>LS: ⑨ Create & assign tasks
  St->>LS: ⑩ Submit task work
  Tr->>LS: ⑪ Review, grade, feedback
  St->>St: ⑫ View feedback & progress
```

---

## Who does what at each step

| # | Role | Action | Page | What others see |
|---|------|--------|------|-----------------|
| ① | **Company** | Add trainer + tracks | `/company/dashboard` → Trainers | Admin: roster · Trainer: portal account |
| ② | **Company** | Create training request | Trainings → Create | Admin: PENDING · Trainer: Pending approval |
| ③ | **Admin** | Approve training | `/admin` → company requests | Company: APPROVED · Catalog: published |
| ④ | **Admin** | (auto) Publish to catalog | `publishCompanyTraining.js` | **Student**: appears on `/services` |
| ⑤ | **Student** | Browse + Enroll | `/services/training/...` | Admin: seatsTaken++ |
| ⑥ | **Student** | Reserve seat | TrainingEnrollButton | — |
| ⑦ | **Student** | Submit application | `/student/enrollment/application` | **Trainer**: pending inbox |
| ⑧ | **Trainer** | Approve / Reject | `/dashboard` → Accept new students | **Student**: workspace opens or rejected |
| ⑨ | **Trainer** | Create task + assign | `/dashboard` + section workspace | **Student**: new task |
| ⑩ | **Student** | Submit work | `/student/submit` | **Trainer**: Task Submissions |
| ⑪ | **Trainer** | Evaluate + feedback | Task Submissions panel | **Student**: `/student/feedback` |
| ⑫ | **Student** | Track progress | `/student/tasks`, progress | — |

---

## 1. Login & role routing

| Role | Demo email | After login |
|------|------------|-------------|
| Admin | `admin123@gmail.com` | `/admin` |
| Company | (member with role=company) | `/company/dashboard` |
| Trainer | `trainer2003@gmail.com` | `/dashboard` |
| Student | `mohamed.ali@example.com` | `/student/applications` |

```mermaid
sequenceDiagram
  actor U as User
  participant LP as LoginPage
  participant Auth as authApi
  participant API as Backend / static roster
  participant LS as trainer-auth

  U->>LP: email + password
  LP->>Auth: login()
  Auth->>API: POST /auth/login or offline verify
  API-->>Auth: JWT + role
  Auth->>LS: save session

  alt role = admin
    LP->>U: 🔶 /admin
  else role = company
    LP->>U: 🔷 /company/dashboard
  else role = trainer
    LP->>U: 🟣 /dashboard
  else role = student
    LP->>U: 🔵 /student/applications
  end
```

---

## 2. Register new member

| Role | Who acts | Result |
|------|----------|--------|
| **Guest** | Chooses role on `/register` | Row in `registered_members` |
| **Any role** | Logs in later | Redirected by chosen role |

```mermaid
sequenceDiagram
  actor G as 🌐 Guest
  participant RP as RegisterPage
  participant RM as useRegisteredMembers

  G->>RP: name, email, password, role
  Note over G,RP: role ∈ admin | company | trainer | student
  RP->>RM: appendRegisteredMember()
  RM->>RM: members + credentials
  RP->>G: → /login
```

---

## 3. 🔷 Company adds a trainer

| # | Role | Action |
|---|------|--------|
| 1 | **Company** | Trainers → Add Trainer |
| 2 | **Company** | Sets fullName, email, linked tracks |
| 3 | **System** | Saves to `itconnect_company_trainers_v1` |
| 4 | **Company** (optional) | Creates portal account for trainer |
| 5 | **Trainer** | Logs in later → `/dashboard` (empty until assigned to a training) |

```mermaid
sequenceDiagram
  actor Co as 🔷 Company
  actor Tr as 🟣 Trainer
  participant CD as CompanyDashboard
  participant LS as localStorage

  Co->>CD: Add Trainer
  CD->>LS: company_trainers_v1
  Note over Tr: No trainings yet
  Tr->>Tr: Login → /dashboard
  Note over Tr: Sidebar: No trainings assigned yet
```

---

## 4. 🔷 Company → 🔶 Admin → Catalog → 🟣 Trainer

| # | Role | Action | Status |
|---|------|--------|--------|
| 1 | **Company** | Create training | `reviewStatus: PENDING` |
| 2 | **Trainer** | — (shown as pending) | Sidebar: Pending approval |
| 3 | **Admin** | Approve | `APPROVED` + `publishedTrainingId` |
| 4 | **Student** | — | Visible on `/services` |
| 5 | **Trainer** | — | Sidebar: Active |

```mermaid
sequenceDiagram
  actor Co as 🔷 Company
  actor Ad as 🔶 Admin
  actor Tr as 🟣 Trainer
  actor St as 🔵 Student
  participant LS as localStorage
  participant Svc as /services

  Co->>LS: Create Training Request (trainerEmail)
  Note over Co,LS: PENDING
  Tr->>Tr: Sidebar ← pending request

  Ad->>LS: Approve → publish catalog
  Note over Ad,LS: APPROVED
  LS->>Svc: training visible
  Tr->>Tr: Sidebar ← active training
  Note over St: Can Enroll once catalog is live
```

| After | Company | Admin | Trainer | Student |
|-------|---------|-------|---------|---------|
| Create | Sees PENDING | Sees in queue | Pending approval | — |
| Approve | APPROVED | In catalog | Active | Enroll available |
| Reject | REJECTED | — | Removed | — |

---

## 5. 🔶 Admin publishes training directly

| Role | Part in flow |
|------|--------------|
| **Admin** | Creates training from `/admin` → Trainings |
| **Student** | Sees it on `/services` (no company request) |
| **Trainer** | **Does not** see it unless `trainerEmail` is on a company request |

```mermaid
sequenceDiagram
  actor Ad as 🔶 Admin
  actor St as 🔵 Student
  participant AD as AdminDashboard
  participant LS as localStorage

  Ad->>AD: Create training
  AD->>LS: admin_created_trainings_v1
  AD->>AD: admin-created-trainings event
  St->>St: Sees it on /services → Enroll
```

---

## 6. 🔷 Company → 🔶 Admin — custom track request

| # | Role | Action |
|---|------|--------|
| 1 | **Company** | Tracks → Request custom track |
| 2 | **Admin** | Approve → creates track in branch |
| 3 | **Company** | Uses track when creating a training |

```mermaid
sequenceDiagram
  actor Co as 🔷 Company
  actor Ad as 🔶 Admin
  participant LS as localStorage

  Co->>LS: track request (PENDING)
  Ad->>LS: approve → admin_created_tracks
  Co->>Co: Select track on new training
```

---

## 7. 🔵 Student enrolls in a training

| # | Role | Action | Page |
|---|------|--------|------|
| 0 | **Guest** | Enroll → redirect to login | `/login?redirect=...` |
| 1 | **Student** | Enroll (reserve seat) | `/services/training/...` |
| 2 | **Student** | Application + CV | `/student/enrollment/application` |
| 3 | **Trainer** | Sees pending | `/dashboard` → Accept new students |
| 4 | **Admin** | seatsTaken updates | `/admin` stats |

```mermaid
sequenceDiagram
  actor St as 🔵 Student
  actor Tr as 🟣 Trainer
  actor Ad as 🔶 Admin
  participant Btn as TrainingEnrollButton
  participant App as EnrollmentApplication
  participant LS as localStorage / API

  St->>Btn: Enroll
  Btn->>LS: catalog enrollment + seat++
  Note over Ad: Admin stats refresh
  St->>App: Submit form + CV
  App->>LS: application status=pending
  Tr->>Tr: notification + inbox
```

| Stage | Student sees | Trainer sees | Admin sees |
|-------|--------------|--------------|------------|
| After Enroll | Application form | — | Seat +1 |
| After Submit | status: pending | pending in inbox | — |
| After Approve | `/student/tasks` | enrolled list | — |

---

## 8. 🟣 Trainer approves enrollment application

| # | Role | Action | Student outcome |
|---|------|--------|-----------------|
| 1 | **Trainer** | Accept new students | — |
| 2 | **Trainer** | Approve | Workspace unlocked |
| 2b | **Trainer** | Reject | status: rejected + reason |

```mermaid
sequenceDiagram
  actor Tr as 🟣 Trainer
  actor St as 🔵 Student
  participant Panel as EnrollmentApplicationsPanel
  participant API as enrollmentApplicationApi

  Tr->>Panel: Approve application
  Panel->>API: approve (API or localStorage)
  API->>St: notification
  St->>St: /student/tasks unlocked

  alt Reject
    Tr->>Panel: Reject + reason
    St->>St: enrollment/status → rejected
  end
```

---

## 9. 🟣 Trainer sees trainings in workspace

| Role | Sees | Does not see |
|------|------|--------------|
| **Trainer** (on company roster) | Requests where `trainerEmail` = their email | Seed data, empty track placeholders |
| **Trainer** (not on company roster) | Demo `trainingSections` only | — |

```mermaid
flowchart TD
  subgraph Company["🔷 Company"]
    C1[Create request + trainerEmail]
  end

  subgraph System
    S1{trainerEmail = logged-in trainer?}
    S2{reviewStatus?}
  end

  subgraph Trainer["🟣 Trainer Sidebar"]
    T1[Pending approval]
    T2[Active training]
    T3[Empty — no assignment]
  end

  C1 --> S1
  S1 -->|No| T3
  S1 -->|Yes| S2
  S2 -->|PENDING| T1
  S2 -->|APPROVED| T2
```

---

## 10. 🟣 Trainer creates task → 🔵 Student submits → evaluation

| # | Role | Action | Page |
|---|------|--------|------|
| 1 | **Trainer** | Create task brief | `/dashboard` → Create Task |
| 2 | **Trainer** | Assign to students | `/dashboard/section/:id` |
| 3 | **Student** | Submit work | `/student/submit` |
| 4 | **Trainer** | Review + grade | Task Submissions |
| 5 | **Student** | Read feedback | `/student/feedback` |

```mermaid
sequenceDiagram
  actor Tr as 🟣 Trainer
  actor St as 🔵 Student
  participant TD as TrainerDashboard
  participant Sub as StudentSubmitPage
  participant Eval as TaskSubmissionsPanel

  Tr->>TD: Create task brief
  Tr->>TD: Assign to students
  St->>Sub: Submit work
  Sub->>Tr: notify trainer
  Tr->>Eval: Grade + feedback
  Eval->>St: StudentFeedbackPage
```

---

## 11. 🟣 Trainer publishes topic documentation

| # | Role | Action |
|---|------|--------|
| 1 | **Trainer** | Publishes topic for approved training |
| 2 | **Student** | Reads on `/student/topics` (after approval) |

```mermaid
sequenceDiagram
  actor Tr as 🟣 Trainer
  actor St as 🔵 Student
  participant Store as topicDocumentationStorage

  Tr->>Store: save topic (sections, media)
  St->>Store: read published topics
  Note over St: requires approved enrollment
```

---

## 12. Messages between roles

Any logged-in role can message others:

| Sender | Receiver | Page |
|--------|----------|------|
| Student | Trainer / Admin / … | `/student/messages` or `/messages` |
| Trainer | Student / Company / … | `/messages` |
| Company | — | (Messages link removed from company header) |
| Admin | — | via members / direct |

```mermaid
sequenceDiagram
  actor A as Any role (sender)
  actor B as Any role (receiver)
  participant API as messageApi / MessagesController

  A->>API: sendRoleMessage()
  B->>API: getMessagesForUser()
  API-->>B: conversation
```

---

## 13. System custom events

| Event | Triggered by (role / component) | Affects |
|-------|----------------------------------|---------|
| `admin-created-trainings` | 🔶 Admin action | 🌐 Home, Services · 🔵 Student catalog |
| `company-training-requests` | 🔷 Company / 🔶 Admin | 🔶 Admin queue · 🟣 Trainer sidebar |
| `company-trainers-changed` | 🔷 Company | 🔶 Admin trainers tab |
| `ts-catalog-enrollment-changed` | 🔵 Student enroll | 🔶 Admin seats · Enroll button |
| `ts-enrollment-applications-changed` | 🔵 Student submit · 🟣 Trainer approve | 🟣 Inbox · 🔵 Student access |
| `registered-members-changed` | 🌐 Register / 🔶 Admin members | Auth for all roles |

```mermaid
flowchart LR
  subgraph Roles
    Ad[🔶 Admin]
    Co[🔷 Company]
    Tr[🟣 Trainer]
    St[🔵 Student]
  end

  Ad -->|admin-created-trainings| St
  Co -->|company-training-requests| Ad
  Co -->|company-training-requests| Tr
  Co -->|company-trainers-changed| Tr
  St -->|catalog-enrollment-changed| Ad
  St -->|enrollment-applications-changed| Tr
  Tr -->|enrollment-applications-changed| St
```

---

## Quick reference: role → storage

| Role | Main localStorage / backend keys |
|------|----------------------------------|
| **All roles** | `trainer-auth` |
| **Admin** | `admin_created_trainings`, `admin_created_tracks`, `trainer_track_assignments` |
| **Company** | `company_profiles`, `company_trainers`, `company_training_requests` |
| **Trainer** | Reads `company_training_requests` (filtered by email) |
| **Student** | `catalog-training-enrollments-{userId}`, `enrollment-applications` |
| **Shared backend** | `App_Data/enrollment-applications.json`, Messages, Tasks API |

---

## Quick summary by role

```
🔷 Company:  trainer → training request → (waits for Admin)
🔶 Admin:    approve → catalog
🟣 Trainer:  sees training → accepts students → tasks → evaluation
🔵 Student:  Enroll → Application → Tasks → Submit → Feedback
```
