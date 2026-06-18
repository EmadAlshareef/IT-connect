# تقرير المرحلة الثانية — ربط المستخدمين بالشركات

**التاريخ:** 2026-06-08  
**قاعدة البيانات:** `ITConnectDb_v3`  
**سكربت التطبيق:** `backend/scripts/Phase2_MultiTenant_UserCompanies.sql`  
**المتطلب السابق:** المرحلة الأولى (`Companies` + `CompanyId` على الجداول)

---

## 1. قرار التصميم: لماذا `UserCompanies` وليس `CompanyId` على `AspNetUsers`؟

بعد مراجعة `AspNetUsers` / `ApplicationUser`:

| الحقل الحالي | الغرض |
|--------------|--------|
| `Id` | مفتاح Identity (GUID) |
| `FullName`, `Email`, `UserName` | بيانات الحساب |
| `LegacyUserId` | توافق API القديم (`student-mohamed`, `admin`, …) |
| `TrainerLegacyId` | مدرب مُعيَّن للطالب |
| `AssignedTrainerUserId` | FK لمدرب في SQL v3 |
| `IsDeleted` | حذف ناعم |

### الخياران المطلوبان

| الخيار | المزايا | العيوب |
|--------|---------|--------|
| **`CompanyId` على `AspNetUsers`** | استعلام بسيط | Admin يحتاج NULL دائماً؛ مستخدم واحد = شركة واحدة فقط؛ يخلط Identity مع Tenant |
| **`UserCompanies` (تم اختياره)** | Admin بلا صفوف = مستقل عن الشركات؛ دعم عضوية متعددة لاحقاً؛ لا تعديل على أعمدة Identity الحالية | استعلام join إضافي |

**القرار:** جدول ربط **`UserCompanies`** لأنه:

1. **Platform Admin** (`admin`) يبقى بدون عضوية شركة — لا غموض في `CompanyId = NULL`
2. **المدرب/الطالب/الشركة** يمكن ربطهم بشركة عبر صف في `UserCompanies`
3. لا يمس جداول Identity migrations الموجودة
4. يدعم مستقبلاً: مدرب يعمل لشركتين، أو مستخدم بشركة أساسية (`IsPrimary`)

---

## 2. ما تم تنفيذه

### جدول جديد: `UserCompanies`

| العمود | النوع | ملاحظات |
|--------|-------|---------|
| `UserId` | `NVARCHAR(450)` | FK → `AspNetUsers.Id` |
| `CompanyId` | `NVARCHAR(64)` | FK → `Companies.Id` |
| `IsPrimary` | `BIT` | DEFAULT 1 — الشركة الأساسية للمستخدم |
| `CreatedAt` | `DATETIME2(3)` | DEFAULT SYSUTCDATETIME() |

**Primary Key:** `(UserId, CompanyId)`

### Foreign Keys

| Constraint | ON DELETE |
|------------|-----------|
| `FK_UserCompanies_UserId` → `AspNetUsers` | CASCADE |
| `FK_UserCompanies_CompanyId` → `Companies` | CASCADE |

### Indexes

| Index | الغرض |
|-------|--------|
| `PK_UserCompanies` | مفتاح مركب |
| `IX_UserCompanies_CompanyId` | بحث أعضاء شركة |
| `IX_UserCompanies_UserId` | بحث شركات المستخدم |
| `UX_UserCompanies_PrimaryPerUser` | شركة أساسية واحدة لكل مستخدم (`WHERE IsPrimary = 1`) |

### تعديلات EF (فقط)

| الملف | التعديل |
|-------|---------|
| `Domain/Entities/UserCompany.cs` | Entity جديد |
| `Domain/Entities/ApplicationUser.cs` | `CompanyMemberships` navigation |
| `Domain/Entities/Portal/PortalEntities.cs` | `UserMemberships` على `Company` |
| `Infrastructure/Persistence/ApplicationDbContext.cs` | `DbSet<UserCompany>` + EF config |

### ما لم يُمس

- `AspNetUsers` — **لا عمود `CompanyId` جديد**
- `Branch` / `BranchId` — بدون تغيير
- Controllers, Services, APIs, Frontend
- Query Filters, Middleware
- **لا نقل بيانات** — `UserCompanies` فارغ حالياً

---

## 3. كيف أصبح المستخدم مرتبطاً بالشركة؟

```
AspNetUsers (حساب Identity)
       │
       │  0..N صفوف في UserCompanies
       ▼
UserCompanies (UserId + CompanyId + IsPrimary)
       │
       ▼
Companies (الشركة / Tenant)
```

### أمثلة (مستقبلية — لم تُنفَّذ بعد)

| المستخدم | الدور | `UserCompanies` |
|----------|-------|-----------------|
| `admin123@gmail.com` | Admin | **لا صفوف** — إدارة المنصة كاملة |
| `company@acme.com` | Company | صف واحد: `(userId, acme-company-id, IsPrimary=1)` |
| `trainer@acme.com` | Trainer | صف: عضوية في `acme-company-id` |
| `student@acme.com` | Student | صف: عضوية في `acme-company-id` |

### العلاقة مع `CompanyId` على الجداول الأخرى (المرحلة 1)

| الطبقة | الربط |
|--------|--------|
| **مستخدم → شركة** | `UserCompanies` |
| **تدريب/مسار/منشور → شركة** | `Tracks.CompanyId`, `Trainings.CompanyId`, … (nullable) |

المرحلتان مكملتان: المستخدم ينتمي لشركة عبر `UserCompanies`، والمحتوى يُوسم بـ `CompanyId` على سجلات الكتالوج.

---

## 4. هل يمكن ربط Student / Trainer / Admin بالشركة؟

| الدور | قابل للربط؟ | الطريقة المقترحة |
|-------|-------------|------------------|
| **Company** | نعم | صف إلزامي في `UserCompanies` عند إنشاء/تفعيل الشركة |
| **Trainer** | نعم | صف في `UserCompanies` + اختياري ربط `Trainings.CompanyId` |
| **Student** | نعم | صف في `UserCompanies` (شركة التسجيل) + `EnrollmentApplications.CompanyId` |
| **Admin (Platform)** | اختياري | **بدون صفوف** = وصول لكل الشركات (Super Admin) |
| **Admin (Company)** | نعم (مستقبلاً) | صف في `UserCompanies` + دور `CompanyAdmin` في JWT |

> اليوم: الأدوار من `AspNetUserRoles` فقط — **لم يُفعَّل** العزل بعد.

---

## 5. الخطوة التالية لتفعيل العزل بين الشركات (المرحلة 3+)

### 5.1 APIs جديدة (بدون كسر الحالية)

- `POST/GET /api/companies` — إدارة الشركات
- `POST /api/companies/{id}/members` — ربط مستخدم بشركة (`UserCompanies`)
- عند التسجيل: إنشاء `Company` + صف `UserCompanies` للمستخدم Company/Student

### 5.2 JWT و Middleware

```text
JWT claims: sub, role, company_id (من UserCompanies حيث IsPrimary=1)
     ↓
TenantResolutionMiddleware
     ↓
تصفية تلقائية: CompanyId = current tenant
```

### 5.3 Global Query Filters (EF)

```csharp
// مثال مستقبلي — لم يُنفَّذ
modelBuilder.Entity<Training>()
    .HasQueryFilter(t => t.CompanyId == _tenantId || _tenantId == null);
```

### 5.4 ربط المحتوى بالشركة

عند إنشاء Track/Training/Post:

1. تعيين `CompanyId` من JWT
2. الإبقاء على `BranchId` كما هو (فرع جغرافي داخل الشركة)

### 5.5 نقل البيانات (Backfill)

1. إنشاء شركة `Platform` من بيانات `cairo`
2. ربط seed users بشركة افتراضية حيث يناسب
3. تعيين `CompanyId` على Trainings/Tracks الموجودة

### 5.6 Frontend

- `useCompanyProfiles` → API بدل localStorage
- Company Dashboard يمرّر `companyId` من الجلسة
- Admin: Super Admin يرى الكل، Company Admin يرى tenant واحد

---

## 6. التحقق من SQL

```sql
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserCompanies';

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'UserCompanies';

SELECT name FROM sys.foreign_keys
WHERE parent_object_id = OBJECT_ID('dbo.UserCompanies');

SELECT COUNT(*) AS MembershipRows FROM UserCompanies;  -- متوقع: 0
```

---

## 7. تطبيق السكربت

```powershell
sqlcmd -S DESKTOP-7JAU4ML -d ITConnectDb_v3 -E -i backend\scripts\Phase2_MultiTenant_UserCompanies.sql
```

يتطلب تشغيل المرحلة الأولى أولاً.

---

## 8. ملاحظة تقنية

عند إنشاء `PK_UserCompanies` قد يظهر تحذير SQL Server حول طول المفتاح (900 bytes للـ clustered index). في الممارسة، `UserId` هو GUID (~36 حرفاً) و`CompanyId` قصير — **الإدراج يعمل بشكل طبيعي**. إذا استُخدمت قيم `UserId` بطول 450 حرفاً نادراً، يُنصح بتحويل PK إلى `NONCLUSTERED` في مرحلة لاحقة.

---

*المرحلة الثانية مكتملة. انتظر موافقتك قبل المرحلة الثالية (APIs + JWT + عزل).*
