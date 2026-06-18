# تقرير المرحلة الأولى — تجهيز Multi-Tenant (Companies)

**التاريخ:** 2026-06-08  
**قاعدة البيانات:** `ITConnectDb_v3`  
**سكربت التطبيق:** `backend/scripts/Phase1_MultiTenant_Companies.sql`

---

## ما تم تنفيذه

تم تجهيز قاعدة البيانات فقط لاستقبال الشركات (Tenants) **دون**:

- حذف `Branches` أو `BranchId`
- تعديل أي API أو Query
- نقل البيانات الحالية
- Tenant Middleware أو Global Query Filters

---

## 1. الجدول الجديد: `Companies`

| العمود | النوع | ملاحظات |
|--------|-------|---------|
| `Id` | `NVARCHAR(64)` | PK |
| `Name` | `NVARCHAR(200)` | NOT NULL |
| `Slug` | `NVARCHAR(120)` | NOT NULL, UNIQUE |
| `Email` | `NVARCHAR(256)` | NULL |
| `Phone` | `NVARCHAR(32)` | NULL |
| `LogoUrl` | `NVARCHAR(500)` | NULL |
| `IsActive` | `BIT` | DEFAULT 1 |
| `CreatedAt` | `DATETIME2(3)` | DEFAULT SYSUTCDATETIME() |
| `UpdatedAt` | `DATETIME2(3)` | DEFAULT SYSUTCDATETIME() |

### Indexes على `Companies`

| Index | النوع |
|-------|-------|
| `PK_Companies` | Primary Key |
| `UX_Companies_Slug` | UNIQUE على `Slug` |
| `IX_Companies_IsActive` | Filtered: `WHERE IsActive = 1` |

---

## 2. الجداول المعدّلة (عمود `CompanyId` مضاف)

| الجدول | العمود الجديد | Nullable | `BranchId` |
|--------|---------------|----------|------------|
| `Tracks` | `CompanyId NVARCHAR(64)` | نعم | **لم يُمس** |
| `Trainings` | `CompanyId NVARCHAR(64)` | نعم | **لم يُمس** |
| `CompanyPosts` | `CompanyId NVARCHAR(64)` | نعم | **لم يُمس** |
| `JobApplicants` | `CompanyId NVARCHAR(64)` | نعم | **لم يُمس** |
| `EnrollmentApplications` | `CompanyId NVARCHAR(64)` | نعم | **لم يُمس** |
| `TrainingSections` | `CompanyId NVARCHAR(64)` | نعم | — |
| `InternshipPrograms` | `CompanyId NVARCHAR(64)` | نعم | — |
| `PortalNotifications` | `CompanyId NVARCHAR(64)` | نعم | **لم يُمس** |

> جميع صفوف البيانات الحالية لديها `CompanyId = NULL` — السلوك الحالي لم يتغير.

---

## 3. Foreign Keys الجديدة

| Constraint | من جدول | إلى `Companies.Id` | ON DELETE |
|------------|---------|-------------------|-----------|
| `FK_Tracks_CompanyId` | `Tracks` | `Companies` | SET NULL |
| `FK_Trainings_CompanyId` | `Trainings` | `Companies` | SET NULL |
| `FK_CompanyPosts_CompanyId` | `CompanyPosts` | `Companies` | SET NULL |
| `FK_JobApplicants_CompanyId` | `JobApplicants` | `Companies` | SET NULL |
| `FK_Enrollment_CompanyId` | `EnrollmentApplications` | `Companies` | SET NULL |
| `FK_TrainingSections_CompanyId` | `TrainingSections` | `Companies` | SET NULL |
| `FK_InternshipPrograms_CompanyId` | `InternshipPrograms` | `Companies` | SET NULL |
| `FK_Notifications_CompanyId` | `PortalNotifications` | `Companies` | SET NULL |

---

## 4. Indexes على `CompanyId`

| Index | الجدول |
|-------|--------|
| `IX_Tracks_CompanyId` | `Tracks` |
| `IX_Trainings_CompanyId` | `Trainings` |
| `IX_CompanyPosts_CompanyId` | `CompanyPosts` |
| `IX_JobApplicants_CompanyId` | `JobApplicants` |
| `IX_Enrollment_CompanyId` | `EnrollmentApplications` |
| `IX_TrainingSections_CompanyId` | `TrainingSections` |
| `IX_InternshipPrograms_CompanyId` | `InternshipPrograms` |
| `IX_Notifications_CompanyId` | `PortalNotifications` |

---

## 5. تعديلات EF (تعكس السكيمة فقط — بدون تغيير سلوك API)

| الملف | التعديل |
|-------|---------|
| `Domain/Entities/Portal/PortalEntities.cs` | Entity `Company` + `CompanyId?` على 8 entities |
| `Infrastructure/Persistence/PortalModelConfiguration.cs` | FK + Indexes في EF config |
| `Infrastructure/Persistence/ApplicationDbContext.cs` | `DbSet<Company> Companies` |

> **لم يُعدَّل:** أي Controller، Service، DTO، أو Frontend.

---

## 6. ما لم يتغير (مؤكد)

| العنصر | الحالة |
|--------|--------|
| جدول `Branches` | بدون تعديل |
| عمود `BranchId` في كل الجداول | بدون حذف |
| APIs (`/api/catalog/*`, …) | بدون تعديل |
| Queries في `EfCatalogService` | بدون تعديل |
| البيانات الحالية | بدون نقل |
| `TrainingSections.Company` (نص) | **بقي كما هو** بجانب `CompanyId` الجديد |
| `InternshipPrograms.Company` (نص) | **بقي كما هو** بجانب `CompanyId` الجديد |

---

## 7. أماكن تحتاج تحديثاً مستقبلياً (المراحل القادمة)

### المرحلة 2 — APIs و CRUD

| المنطقة | الملفات | المطلوب |
|---------|---------|---------|
| Companies API | جديد: `CompaniesController` | CRUD للشركات |
| Catalog writes | `EfCatalogService.cs` | تعيين `CompanyId` عند الإنشاء |
| Enrollment | `EfEnrollmentApplicationService.cs` | ربط `CompanyId` من Training |
| DTOs | `CatalogModels.cs` | إضافة `CompanyId` اختياري |

### المرحلة 3 — Auth و Middleware

| المنطقة | المطلوب |
|---------|---------|
| JWT | claim `company_id` أو `tenant_id` |
| Middleware | Tenant Resolution |
| EF | Global Query Filters على `CompanyId` |
| `AspNetUsers` | جدول `UserCompanies` أو `CompanyId` |

### المرحلة 4 — Frontend

| المنطقة | الملفات |
|---------|---------|
| Company profiles | `useCompanyProfiles.js` → API |
| Company Dashboard | `CompanyDashboard.jsx` |
| Admin Companies tab | `AdminDashboard.jsx` |
| localStorage migration | كل مفاتيح `itconnect_company_*` |

### المرحلة 5 — Data Migration

| المهمة | التفاصيل |
|--------|----------|
| Backfill | إنشاء شركات من profiles الحالية |
| ربط Trainings/Tracks | تعيين `CompanyId` للصفوف الموجودة |
| إزالة النص | استبدال `TrainingSections.Company` بـ FK تدريجياً |

### جداول لم تُضف لها `CompanyId` بعد (مراحل لاحقة)

| الجدول | السبب |
|--------|--------|
| `Tasks` / `TaskSubmissions` | عزل عبر `SectionId` → `CompanyId` |
| `Messages` / `TrainerFeedback` | عزل عبر المستخدمين |
| `TraineeEvaluations` | عزل عبر المدرب/القسم |
| `SectionEnrollments` | عزل عبر `SectionId` |
| `AspNetUsers` | يحتاج `UserTenants` |

---

## 8. كيفية تطبيق السكربت

```powershell
sqlcmd -S DESKTOP-7JAU4ML -d ITConnectDb_v3 -E -i backend\scripts\Phase1_MultiTenant_Companies.sql
```

السكربت **idempotent** — آمن لإعادة التشغيل.

---

## 9. التحقق

```sql
-- جدول Companies موجود
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Companies';

-- أعمدة CompanyId
SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME = 'CompanyId'
ORDER BY TABLE_NAME;

-- Foreign Keys
SELECT name FROM sys.foreign_keys WHERE name LIKE '%CompanyId%';
```

---

*المرحلة الأولى مكتملة. انتظر موافقتك قبل بدء المرحلة الثانية.*
