# تقرير المرحلة الرابعة — APIs بيانات الشركات

**التاريخ:** 2026-06-07  
**قاعدة البيانات:** `ITConnectDb_v3` (SQL Server فقط)  
**المتطلبات السابقة:** المرحلة 1–3 (جداول + EF)

---

## 1. ملخص التنفيذ

تم إنشاء **6 Controllers** جديدة مع **Service واحد** (`ICompanyPortalService` / `EfCompanyPortalService`) و**DTOs** كاملة لجميع موارد بيانات الشركات.

| ما تم | ما لم يُمس |
|-------|------------|
| APIs جديدة CRUD كاملة | Branch / BranchId |
| SQL Server فقط في الـ Service | localStorage في Frontend |
| تسجيل DI في `Program.cs` | صلاحيات الطلاب/المدربين |
| | أي API موجود |
| | أي Hook في Frontend |

**Frontend ما زال يعتمد على localStorage بالكامل** — لا migration في هذه المرحلة.

---

## 2. APIs الجديدة والـ Routes

Base URL: `http://localhost:5114/api`

### 2.1 Companies — `AdminOnly`

| Method | Route | الوصف |
|--------|-------|--------|
| `GET` | `/Companies` | قائمة الشركات النشطة |
| `GET` | `/Companies?email={email}` | فلترة بالبريد |
| `GET` | `/Companies/{id}` | شركة بالمعرّف |
| `POST` | `/Companies` | إنشاء شركة |
| `PUT` | `/Companies/{id}` | تحديث شركة |
| `DELETE` | `/Companies/{id}` | حذف ناعم (`IsActive = false`) |

### 2.2 Company Trainers — `Admin,Company`

| Method | Route | الوصف |
|--------|-------|--------|
| `GET` | `/CompanyTrainers` | قائمة المدربين |
| `GET` | `/CompanyTrainers?companyId=&companyEmail=` | فلترة |
| `GET` | `/CompanyTrainers/{id}` | مدرب بالمعرّف |
| `POST` | `/CompanyTrainers` | إنشاء مدرب + مسارات مرتبطة |
| `PUT` | `/CompanyTrainers/{id}` | تحديث مدرب |
| `DELETE` | `/CompanyTrainers/{id}` | حذف ناعم |

### 2.3 Company Track Requests — `Admin,Company`

| Method | Route | الوصف |
|--------|-------|--------|
| `GET` | `/CompanyTrackRequests` | قائمة الطلبات |
| `GET` | `/CompanyTrackRequests?companyId=&companyEmail=&branchId=` | فلترة |
| `GET` | `/CompanyTrackRequests/{id}` | طلب بالمعرّف |
| `POST` | `/CompanyTrackRequests` | إنشاء طلب مسار |
| `PUT` | `/CompanyTrackRequests/{id}` | تحديث (بما فيها الموافقة/الرفض) |
| `DELETE` | `/CompanyTrackRequests/{id}` | حذف ناعم |

### 2.4 Company Training Requests — `Admin,Company`

| Method | Route | الوصف |
|--------|-------|--------|
| `GET` | `/CompanyTrainingRequests` | قائمة الطلبات |
| `GET` | `/CompanyTrainingRequests?companyId=&companyEmail=&branchId=` | فلترة |
| `GET` | `/CompanyTrainingRequests/{id}` | طلب بالمعرّف |
| `POST` | `/CompanyTrainingRequests` | إنشاء طلب تدريب |
| `PUT` | `/CompanyTrainingRequests/{id}` | تحديث (بما فيها `reviewStatus`, `publishedTrainingId`) |
| `DELETE` | `/CompanyTrainingRequests/{id}` | حذف ناعم |

### 2.5 Company Post Requests — `Admin,Company`

| Method | Route | الوصف |
|--------|-------|--------|
| `GET` | `/CompanyPostRequests` | قائمة الطلبات |
| `GET` | `/CompanyPostRequests?companyId=&companyEmail=&branchId=` | فلترة |
| `GET` | `/CompanyPostRequests/{id}` | طلب بالمعرّف |
| `POST` | `/CompanyPostRequests` | إنشاء طلب منشور |
| `PUT` | `/CompanyPostRequests/{id}` | تحديث |
| `DELETE` | `/CompanyPostRequests/{id}` | حذف ناعم |

### 2.6 Company Selected Tracks — `Admin,Company`

| Method | Route | الوصف |
|--------|-------|--------|
| `GET` | `/CompanySelectedTracks` | قائمة المسارات المختارة |
| `GET` | `/CompanySelectedTracks?companyId=&companyEmail=` | فلترة |
| `GET` | `/CompanySelectedTracks/{id}` | عنصر بالمعرّف |
| `POST` | `/CompanySelectedTracks` | إضافة مسار مختار |
| `PUT` | `/CompanySelectedTracks/{id}` | تحديث |
| `DELETE` | `/CompanySelectedTracks/{id}` | حذف فعلي من الجدول |

**ملاحظة:** `POST` على Selected Tracks يُرجع `409 Conflict` عند التكرار `(companyEmail, trackValue)`.

---

## 3. Authorization

| Controller | السياسة / الأدوار | السبب |
|------------|-------------------|--------|
| `CompaniesController` | `[Authorize(Policy = "AdminOnly")]` | إدارة ملفات الشركات من Admin Dashboard (كما `MembersController`) |
| باقي الـ 5 Controllers | `[Authorize(Roles = "Admin,Company")]` | Admin يراجع الطلبات + مستخدمو Company يديرون بياناتهم |

**لم تُضف سياسات جديدة** — تُستخدم السياسات والأدوار الموجودة في `Program.cs` و Identity:

- `AdminOnly` → دور `Admin`
- `Company` → دور `Company` (موجود في `IdentityDataSeeder`)

**لا يوجد فلترة tenant على مستوى الـ API بعد** — أي مستخدم Admin أو Company يمكنه الوصول لجميع السجلات عبر query params. الفلترة per-company ستُضاف عند ربط Frontend.

---

## 4. DTOs

**الملف:** `backend/Models/CompanyPortalModels.cs`

### Response DTOs

| DTO | يمثّل |
|-----|--------|
| `CompanyDto` | شركة + حقول الملف العام |
| `CompanyTrainerDto` | مدرب + `LinkedTrackTitles[]` |
| `CompanyTrackRequestDto` | طلب مسار |
| `CompanyTrainingRequestDto` | طلب تدريب |
| `CompanyPostRequestDto` | طلب منشور |
| `CompanySelectedTrackDto` | مسار مختار |

### Request DTOs

| Create | Update |
|--------|--------|
| `CreateCompanyRequest` | `UpdateCompanyRequest` |
| `CreateCompanyTrainerRequest` | `UpdateCompanyTrainerRequest` |
| `CreateCompanyTrackRequestRequest` | `UpdateCompanyTrackRequestRequest` |
| `CreateCompanyTrainingRequestRequest` | `UpdateCompanyTrainingRequestRequest` |
| `CreateCompanyPostRequestRequest` | `UpdateCompanyPostRequestRequest` |
| `CreateCompanySelectedTrackRequest` | `UpdateCompanySelectedTrackRequest` |

### تعيين الحقول مع localStorage (للمرحلة القادمة)

| localStorage | API DTO |
|--------------|---------|
| `companyName` | `CompanyDto.Name` |
| `contactEmail` | `CompanyDto.Email` |
| `trainer` | `CompanyTrainingRequestDto.TrainerName` |
| `status` (training) | `TrainingStatus` |
| `reviewStatus` | `ReviewStatus` |
| `linkedTrackTitles` | `CompanyTrainerDto.LinkedTrackTitles` |
| `trackValue` | `CompanySelectedTrackDto.TrackValue` |
| `id` (localStorage) | `LegacyLocalId` عند النقل |

---

## 5. Services

| الملف | الدور |
|-------|-------|
| `Services/ICompanyPortalService.cs` | واجهة 30 عملية async |
| `Infrastructure/Persistence/Services/EfCompanyPortalService.cs` | تنفيذ EF Core على SQL Server |

### سلوك الـ Service

- **List:** فلاتر اختيارية `companyId`, `companyEmail`, `branchId`
- **Create:** توليد معرّفات (`co-…`, `co-tr-…`, `ctr-…`, …) أو حفظ `LegacyLocalId`
- **ResolveCompanyId:** ربط تلقائي بـ `Companies.Email` عند غياب `CompanyId`
- **Delete:** حذف ناعم (`IsDeleted` / `IsActive`) ما عدا `CompanySelectedTracks` (حذف فعلي)
- **BranchId:** يُحفظ كما في localStorage (افتراضي `cairo`)

### DI

```csharp
// Program.cs — داخل useSqlServer فقط
builder.Services.AddScoped<ICompanyPortalService, EfCompanyPortalService>();
```

**غير مسجّل** في فرع in-memory (SQLite) — مثل `ICatalogService`.

---

## 6. Controllers

| Controller | الملف |
|------------|-------|
| `CompaniesController` | `Controllers/CompaniesController.cs` |
| `CompanyTrainersController` | `Controllers/CompanyTrainersController.cs` |
| `CompanyTrackRequestsController` | `Controllers/CompanyTrackRequestsController.cs` |
| `CompanyTrainingRequestsController` | `Controllers/CompanyTrainingRequestsController.cs` |
| `CompanyPostRequestsController` | `Controllers/CompanyPostRequestsController.cs` |
| `CompanySelectedTracksController` | `Controllers/CompanySelectedTracksController.cs` |

**نمط المشروع:** `sealed class` + primary constructor DI + `[ApiController]` + `[Route("api/[controller]")]`.

---

## 7. ما يحتاج تحديث في Frontend (لاحقاً — خارج نطاق 4)

### 7.1 ملف API جديد

إنشاء `frontend/src/api/companyPortalApi.js` (أو مشابه) يستدعي:

- `/api/Companies`
- `/api/CompanyTrainers`
- `/api/CompanyTrackRequests`
- `/api/CompanyTrainingRequests`
- `/api/CompanyPostRequests`
- `/api/CompanySelectedTracks`

### 7.2 Hooks للتحديث (dual-write ثم SQL-only)

| Hook / util | مفتاح localStorage | API البديل |
|-------------|-------------------|------------|
| `useCompanyProfiles.js` | `itconnect_company_profiles_v1` | `GET/POST/PUT/DELETE /Companies` |
| `useCompanyTrainers.js` | `itconnect_company_trainers_v1` | `/CompanyTrainers` |
| `useCompanyTrackRequests.js` | `itconnect_company_track_requests_v1` | `/CompanyTrackRequests` |
| `useCompanyTrainingRequests.js` | `itconnect_company_training_requests_v1` | `/CompanyTrainingRequests` |
| `useCompanyPostRequests.js` | `itconnect_company_post_requests_v1` | `/CompanyPostRequests` |
| `companySelectedTracks.js` | `itconnect_company_selected_tracks_v1` | `/CompanySelectedTracks` |

### 7.3 صفحات متأثرة

| الصفحة | التغيير المطلوب |
|--------|-----------------|
| `AdminDashboard.jsx` | قراءة/كتابة الشركات والطلبات من API + dual-write |
| `CompanyDashboard.jsx` | نفس الشيء لبيانات الشركة الحالية |
| `catalogCourseContext.js` | قراءة training requests من API |
| `publishCompanyTraining.js` | تحديث `publishedTrainingId` عبر `PUT /CompanyTrainingRequests/{id}` |
| `purgeCompanyLinkedData.js` | حذف عبر APIs بدل مسح localStorage فقط |

### 7.4 تعيين الحقول

- `companyName` ↔ `name`
- `contactEmail` ↔ `email`
- `trainer` ↔ `trainerName`
- `date` ↔ `startDate` (yyyy-MM-dd)
- `reviewedAt` (epoch ms) ↔ `reviewedAt` (ISO DateTime)
- حفظ `legacyLocalId` عند أول مزامنة للحفاظ على المراجع

### 7.5 تحسينات أمنية مقترحة (مرحلة لاحقة)

- فلترة تلقائية لدور `Company` ببريد المستخدم المسجّل
- ربط `UserCompanies` لتحديد `CompanyId`
- إزالة localStorage تدريجياً بعد التحقق من النقل

---

## 8. الملفات المُنشأة / المُعدَّلة

| الملف | نوع |
|-------|-----|
| `Models/CompanyPortalModels.cs` | **جديد** |
| `Services/ICompanyPortalService.cs` | **جديد** |
| `Infrastructure/Persistence/Services/EfCompanyPortalService.cs` | **جديد** |
| `Controllers/CompaniesController.cs` | **جديد** |
| `Controllers/CompanyTrainersController.cs` | **جديد** |
| `Controllers/CompanyTrackRequestsController.cs` | **جديد** |
| `Controllers/CompanyTrainingRequestsController.cs` | **جديد** |
| `Controllers/CompanyPostRequestsController.cs` | **جديد** |
| `Controllers/CompanySelectedTracksController.cs` | **جديد** |
| `Program.cs` | معدّل (DI) |
| `docs/PHASE4_MULTI_TENANT_REPORT.md` | **جديد** |

**Build:** نجح بدون أخطاء.

---

## 9. مثال طلب سريع (بعد تسجيل الدخول)

```http
GET /api/Companies
Authorization: Bearer {admin_token}

POST /api/CompanyTrackRequests
Authorization: Bearer {company_token}
Content-Type: application/json

{
  "title": "Cloud Engineering Track",
  "description": "New track proposal",
  "requestedByEmail": "acme@example.com",
  "branchId": "cairo"
}
```
