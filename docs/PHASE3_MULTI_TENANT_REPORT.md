# تقرير المرحلة الثالثة — حفظ بيانات الشركات في SQL Server

**التاريخ:** 2026-06-07  
**قاعدة البيانات:** `ITConnectDb_v3`  
**سكربت التطبيق:** `backend/scripts/Phase3_MultiTenant_CompanyPortal.sql`  
**المتطلبات السابقة:** المرحلة 1 (`Companies`) + المرحلة 2 (`UserCompanies`)

---

## 1. ملخص التنفيذ

تمت مراجعة جميع بيانات الشركات المخزّنة حالياً في **Frontend localStorage**، وإنشاء جداول SQL Server مطابقة لها مع ربط **`CompanyId`** (قابل للـ NULL حتى اكتمال النقل)، وإضافة **Entities + EF mappings** في الـ Backend.

**لم يُنفَّذ في هذه المرحلة:**

- حذف `Branch` أو أي جدول أو API
- تعديل صلاحيات النظام
- تغيير سلوك الطلاب أو المدربين
- حذف أو تعطيل localStorage
- Controllers / APIs جديدة
- Services / Repositories (غير مطلوبة حتى ربط الـ API في مرحلة لاحقة)
- نقل البيانات الفعلية من localStorage إلى SQL

**النظام يعمل بالطريقتين:** Frontend ما زال يقرأ/يكتب localStorage فقط؛ SQL جاهز للاستقبال والتحقق لاحقاً.

---

## 2. مراجعة بيانات localStorage للشركات

| مفتاح localStorage | الملف | الغرض |
|--------------------|-------|--------|
| `itconnect_company_profiles_v1` | `useCompanyProfiles.js` | ملفات الشركات العامة (Admin + صفحة الشركة) |
| `itconnect_company_trainers_v1` | `useCompanyTrainers.js` | مدربو الشركة ومساراتهم |
| `itconnect_company_track_requests_v1` | `useCompanyTrackRequests.js` | طلبات إنشاء مسارات |
| `itconnect_company_training_requests_v1` | `useCompanyTrainingRequests.js` | طلبات تدريبات الشركة |
| `itconnect_company_post_requests_v1` | `useCompanyPostRequests.js` | طلبات منشورات التوظيف |
| `itconnect_company_selected_tracks_v1` | `companySelectedTracks.js` | المسارات المختارة لكل شركة |

### Company Dashboard

`CompanyDashboard.jsx` **لا يملك مفتاح تخزين مستقل** — يجمع البيانات من الـ hooks أعلاه + `companyBranchId` ثابت (`cairo`) في الواجهة.

---

## 3. الجداول الجديدة والموسَّعة

### 3.1 توسيع `Companies` (بدلاً من جدول منفصل للملفات)

حقول **Company Profiles** تُخزَّن في جدول `Companies` الموجود من المرحلة 1:

| عمود جديد | مصدر localStorage |
|-----------|-------------------|
| `Industry` | `industry` |
| `Location` | `location` |
| `Vision` | `vision` |
| `Description` | `description` |
| `LegacyLocalId` | `id` (مثل `company-1739…`) |

| عمود موجود | مصدر localStorage |
|------------|-------------------|
| `Name` | `companyName` |
| `Slug` | `slug` |
| `Email` | `contactEmail` |
| `LogoUrl` | `logoUrl` |
| `CreatedAt` / `UpdatedAt` | `createdAt` / `updatedAt` |

### 3.2 `CompanyTrainers`

| العمود | مصدر localStorage |
|--------|-------------------|
| `Id` | `id` |
| `CompanyEmail` | `companyEmail` |
| `FullName` | `fullName` |
| `Email` | `email` |
| `CompanyPosition` | `companyPosition` |
| `LegacyLocalId` | `id` |
| `CreatedAt` | `createdAt` |
| `CompanyId` | يُستنتج لاحقاً من `companyEmail` / `UserCompanies` |

### 3.3 `CompanyTrainerLinkedTracks`

| العمود | مصدر localStorage |
|--------|-------------------|
| `TrainerId` | FK → `CompanyTrainers.Id` |
| `TrackTitle` | عنصر من `linkedTrackTitles[]` |
| `SortOrder` | ترتيب العنصر في المصفوفة |

### 3.4 `CompanyTrackRequests`

| العمود | مصدر localStorage |
|--------|-------------------|
| `Id` | `id` |
| `Title` | `title` |
| `Description` | `description` |
| `RequestedBy` | `requestedBy` |
| `RequestedByEmail` / `CompanyEmail` | `requestedByEmail` |
| `BranchId` | `branchId` (**محفوظ**) |
| `Status` | `status` (PENDING / APPROVED / REJECTED) |
| `ReviewedAt` | `reviewedAt` (epoch → DATETIME2 عند النقل) |
| `ReviewedBy` | `reviewedBy` |
| `LegacyLocalId` | `id` |
| `CreatedAt` | `createdAt` |
| `CompanyId` | nullable — يُربط عند النقل |

### 3.5 `CompanyTrainingRequests`

| العمود | مصدر localStorage |
|--------|-------------------|
| `Id` | `id` |
| `Title` | `title` |
| `Body` | `body` |
| `TrackRequestId` | `trackRequestId` |
| `TrackTitle` | `trackTitle` |
| `TrainerName` | `trainer` |
| `TrainerEmail` | `trainerEmail` |
| `StartDate` | `date` |
| `SeatsTotal` | `seatsTotal` |
| `TrainingStatus` | `status` (active / upcoming) |
| `DocumentFileName` | `documentFileName` |
| `DocumentDataUrl` | `documentDataUrl` |
| `RequestedBy` / `RequestedByEmail` | `requestedBy` / `requestedByEmail` |
| `BranchId` | `branchId` (**محفوظ**) |
| `ReviewStatus` | `reviewStatus` |
| `ReviewedAt` | `reviewedAt` |
| `ReviewedBy` | `reviewedBy` |
| `PublishedTrainingId` | `publishedTrainingId` |
| `LegacyLocalId` | `id` |
| `CreatedAt` | `createdAt` |
| `CompanyId` | nullable |

### 3.6 `CompanyPostRequests`

| العمود | مصدر localStorage |
|--------|-------------------|
| `Id` | `id` |
| `Title` | `title` |
| `Body` | `body` |
| `TrainingTitle` | `trainingTitle` |
| `CompanyTrainingRequestId` | `companyTrainingRequestId` |
| `SkillsRaw` | `skillsRaw` |
| `Deadline` | `deadline` |
| `RequestedBy` / `RequestedByEmail` | `requestedBy` / `requestedByEmail` |
| `BranchId` | `branchId` (**محفوظ**) |
| `ReviewStatus` | `reviewStatus` |
| `ReviewedAt` | `reviewedAt` |
| `ReviewedBy` | `reviewedBy` |
| `LegacyLocalId` | `id` |
| `CreatedAt` | `createdAt` |
| `CompanyId` | nullable |

### 3.7 `CompanySelectedTracks`

| العمود | مصدر localStorage |
|--------|-------------------|
| `Id` | يُولَّد عند النقل |
| `CompanyEmail` | `companyEmail` |
| `TrackValue` | `trackValue` |
| `Title` | `title` |
| `AddedAt` | `addedAt` |
| `CompanyId` | nullable |

**فهرس فريد:** `(CompanyEmail, TrackValue)` — يمنع تكرار الاختيار لنفس الشركة.

---

## 4. العلاقات الجديدة

```
Companies (Phase 1 + profile columns)
    │
    ├──< UserCompanies >── AspNetUsers          (Phase 2)
    │
    ├──< CompanyTrainers
    │       └──< CompanyTrainerLinkedTracks
    │
    ├──< CompanyTrackRequests ──> Branches      (BranchId, ON DELETE NO ACTION)
    ├──< CompanyTrainingRequests ──> Branches
    ├──< CompanyPostRequests ──> Branches
    └──< CompanySelectedTracks

جميع FK → Companies.Id: ON DELETE SET NULL
```

| من | إلى | ON DELETE |
|----|-----|-----------|
| `CompanyTrainers.CompanyId` | `Companies.Id` | SET NULL |
| `CompanyTrainerLinkedTracks.TrainerId` | `CompanyTrainers.Id` | CASCADE |
| `CompanyTrackRequests.CompanyId` | `Companies.Id` | SET NULL |
| `CompanyTrackRequests.BranchId` | `Branches.Id` | NO ACTION |
| `CompanyTrainingRequests.CompanyId` | `Companies.Id` | SET NULL |
| `CompanyTrainingRequests.BranchId` | `Branches.Id` | NO ACTION |
| `CompanyPostRequests.CompanyId` | `Companies.Id` | SET NULL |
| `CompanyPostRequests.BranchId` | `Branches.Id` | NO ACTION |
| `CompanySelectedTracks.CompanyId` | `Companies.Id` | SET NULL |

### أعمدة الربط المزدوج (Dual-mode)

كل جدول جديد (ما عدا `CompanyTrainerLinkedTracks`) يحتوي:

- **`CompanyId`** — المفتاح الرسمي للمستأجر (nullable حتى النقل)
- **`CompanyEmail`** أو **`RequestedByEmail`** — لمطابقة localStorage قبل ربط `UserCompanies`

- **`LegacyLocalId`** — للحفاظ على معرّفات localStorage الأصلية عند المزامنة

---

## 5. تعديلات Entity Framework

| الملف | التعديل |
|-------|---------|
| `Domain/Entities/Portal/PortalEntities.cs` | حقول الملف العام على `Company` + navigations |
| `Domain/Entities/Portal/CompanyPortalEntities.cs` | **جديد** — 6 entities |
| `Infrastructure/Persistence/ApplicationDbContext.cs` | 6 `DbSet` جديدة |
| `Infrastructure/Persistence/PortalModelConfiguration.cs` | mappings + indexes + FKs |

**Build:** نجح بدون أخطاء (`TrainerPortal.Api.dll`).

**SQL:** نُفِّذ على `ITConnectDb_v3` بنجاح — الجداول السبعة موجودة.

---

## 6. ما أصبح قابلاً للحفظ في SQL

| بيانات localStorage | جدول SQL | الحالة |
|---------------------|----------|--------|
| Company Profiles | `Companies` (+ أعمدة جديدة) | **جاهز للحفظ** — لا بيانات منقولة بعد |
| Company Trainers | `CompanyTrainers` + `CompanyTrainerLinkedTracks` | **جاهز** |
| Company Track Requests | `CompanyTrackRequests` | **جاهز** |
| Company Training Requests | `CompanyTrainingRequests` | **جاهز** |
| Company Post Requests | `CompanyPostRequests` | **جاهز** |
| Company Selected Tracks | `CompanySelectedTracks` | **جاهز** |
| Company Dashboard (مجمّع) | الجداول أعلاه | **جاهز** عند ربط الـ hooks |

---

## 7. ما الذي بقي معتمداً على localStorage

| المنطقة | السبب |
|---------|--------|
| جميع hooks الشركة (`useCompany*`) | لم تُضف APIs — القراءة/الكتابة من localStorage فقط |
| `companySelectedTracks.js` | كما أعلاه |
| `catalogCourseContext.js` | يقرأ `itconnect_company_training_requests_v1` مباشرة |
| `purgeMemberTrainerLinks.js` | يعدّل `itconnect_company_trainers_v1` |
| `publishCompanyTraining.js` | ينشر تدريبات من طلبات localStorage |
| Admin: إنشاء/تعديل الشركات | `useCompanyProfiles` → localStorage |
| Admin: مراجعة الطلبات | hooks الطلبات → localStorage |
| `companyBranchId = 'cairo'` في Dashboard | ثابت في الواجهة — لم يُربط بـ SQL |

**بيانات أخرى في النظام (خارج نطاق الشركات) ما زالت localStorage:**

- أعضاء مسجّلون (`useRegisteredMembers` — يقرأ API + localStorage للاعتمادات)
- تدريبات/مسارات Admin (`useAdminCreated*`)
- تسجيلات الطلاب، الإشعارات، المهام، إلخ.

---

## 8. خريطة الحقول: localStorage ↔ SQL

### Company Profile

```
localStorage.id              → Companies.LegacyLocalId (+ Companies.Id عند النقل)
localStorage.companyName     → Companies.Name
localStorage.slug            → Companies.Slug
localStorage.contactEmail    → Companies.Email
localStorage.industry        → Companies.Industry
localStorage.location        → Companies.Location
localStorage.vision          → Companies.Vision
localStorage.description     → Companies.Description
localStorage.logoUrl         → Companies.LogoUrl
```

### Company Trainer

```
localStorage.companyEmail       → CompanyTrainers.CompanyEmail (+ CompanyId لاحقاً)
localStorage.linkedTrackTitles  → CompanyTrainerLinkedTracks (صف لكل عنوان)
```

### الطلبات (Track / Training / Post)

```
localStorage.branchId           → *.BranchId (FK → Branches)
localStorage.requestedByEmail   → *.CompanyEmail / RequestedByEmail
localStorage.status/reviewStatus → نفس القيم النصية (PENDING, APPROVED, …)
localStorage.reviewedAt (ms)    → ReviewedAt (تحويل عند النقل)
```

---

## 9. Services / Repositories

**لم يُنشَأ أي Service أو Repository** — المرحلة 3 هي **schema + EF فقط**. طبقة الخدمة ستُضاف في المرحلة التالية عند:

1. إنشاء API endpoints للشركات
2. مزامنة ثنائية الاتجاه (localStorage ↔ SQL)
3. ربط `CompanyId` عبر `UserCompanies` و `contactEmail`

---

## 10. خطوات التحقق المقترحة (المرحلة التالية — خارج نطاق 3)

1. API لقراءة/كتابة `Companies` + الجداول الجديدة
2. عند الحفظ: كتابة SQL **و** localStorage (dual-write)
3. عند التحميل: قراءة SQL إن وُجدت بيانات، وإلا localStorage
4. سكربت backfill لنقل البيانات الحالية من المتصفح
5. بعد التحقق: إزالة الاعتماد على localStorage تدريجياً (مرحلة منفصلة — **ليس الآن**)

---

## 11. الملفات المُنشأة / المُعدَّلة

| الملف | نوع |
|-------|-----|
| `backend/scripts/Phase3_MultiTenant_CompanyPortal.sql` | **جديد** |
| `backend/Domain/Entities/Portal/CompanyPortalEntities.cs` | **جديد** |
| `backend/Domain/Entities/Portal/PortalEntities.cs` | معدّل |
| `backend/Infrastructure/Persistence/ApplicationDbContext.cs` | معدّل |
| `backend/Infrastructure/Persistence/PortalModelConfiguration.cs` | معدّل |
| `docs/PHASE3_MULTI_TENANT_REPORT.md` | **جديد** |

**لم يُمس:** Frontend، Controllers، صلاحيات، Branch، أي API موجود.
