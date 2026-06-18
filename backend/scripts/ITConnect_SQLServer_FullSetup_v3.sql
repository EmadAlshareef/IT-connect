/* =============================================================================
   IT Connect — SQL Server Schema v3 (Production-Ready)
   =============================================================================
   CHANGELOG v2 → v3 (summary — see SCHEMA_v3_CHANGELOG.md)
   - Lookup tables for statuses, categories, notification tones, tags
   - Removed redundant denormalized columns (compat via views)
   - Soft-delete + audit columns + RowVersion on business entities
   - Composite & filtered unique indexes
   - CHECK constraints for domain rules
   - Dashboard views replace stored aggregate counters
   Database: ITConnectDb_v3
   Connection: Server=DESKTOP-7JAU4ML;Database=ITConnectDb_v3;Trusted_Connection=True;TrustServerCertificate=True;
   ============================================================================= */

USE master;
GO
/* Fresh database — drops previous v3 deploy if present */
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = N'ITConnectDb_v3')
BEGIN
    ALTER DATABASE ITConnectDb_v3 SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ITConnectDb_v3;
END
GO
CREATE DATABASE ITConnectDb_v3;
GO
USE ITConnectDb_v3;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ── DROP views first ── */
IF OBJECT_ID(N'dbo.vw_EnrollmentApplications_Detail', N'V') IS NOT NULL DROP VIEW dbo.vw_EnrollmentApplications_Detail;
IF OBJECT_ID(N'dbo.vw_TrackStats', N'V') IS NOT NULL DROP VIEW dbo.vw_TrackStats;
IF OBJECT_ID(N'dbo.vw_SectionStats', N'V') IS NOT NULL DROP VIEW dbo.vw_SectionStats;
IF OBJECT_ID(N'dbo.vw_PortalNotifications_Detail', N'V') IS NOT NULL DROP VIEW dbo.vw_PortalNotifications_Detail;
IF OBJECT_ID(N'dbo.vw_Tasks_Detail', N'V') IS NOT NULL DROP VIEW dbo.vw_Tasks_Detail;
IF OBJECT_ID(N'dbo.vw_Messages_Detail', N'V') IS NOT NULL DROP VIEW dbo.vw_Messages_Detail;
IF OBJECT_ID(N'dbo.vw_TraineeEvaluations_Detail', N'V') IS NOT NULL DROP VIEW dbo.vw_TraineeEvaluations_Detail;
IF OBJECT_ID(N'dbo.vw_CompanyPosts_Detail', N'V') IS NOT NULL DROP VIEW dbo.vw_CompanyPosts_Detail;
IF OBJECT_ID(N'dbo.vw_Trainings_Detail', N'V') IS NOT NULL DROP VIEW dbo.vw_Trainings_Detail;
IF OBJECT_ID(N'dbo.vw_TrainerFeedback_Detail', N'V') IS NOT NULL DROP VIEW dbo.vw_TrainerFeedback_Detail;
GO

/* ── DROP tables (dependency order) ── */
IF OBJECT_ID(N'dbo.CompanyPostTags', N'U') IS NOT NULL DROP TABLE dbo.CompanyPostTags;
IF OBJECT_ID(N'dbo.RefTags', N'U') IS NOT NULL DROP TABLE dbo.RefTags;
IF OBJECT_ID(N'dbo.TR_TaskSubmissions_ClearLastRef', N'TR') IS NOT NULL DROP TRIGGER dbo.TR_TaskSubmissions_ClearLastRef;
IF OBJECT_ID(N'dbo.InternshipApplicationTimelineSteps', N'U') IS NOT NULL DROP TABLE dbo.InternshipApplicationTimelineSteps;
IF OBJECT_ID(N'dbo.InternshipApplications', N'U') IS NOT NULL DROP TABLE dbo.InternshipApplications;
IF OBJECT_ID(N'dbo.InternshipPrograms', N'U') IS NOT NULL DROP TABLE dbo.InternshipPrograms;
IF OBJECT_ID(N'dbo.EvaluationTaskItems', N'U') IS NOT NULL DROP TABLE dbo.EvaluationTaskItems;
IF OBJECT_ID(N'dbo.TraineeEvaluations', N'U') IS NOT NULL DROP TABLE dbo.TraineeEvaluations;
IF OBJECT_ID(N'dbo.TrainerFeedback', N'U') IS NOT NULL DROP TABLE dbo.TrainerFeedback;
IF OBJECT_ID(N'dbo.Messages', N'U') IS NOT NULL DROP TABLE dbo.Messages;
IF OBJECT_ID(N'dbo.TaskSubmissions', N'U') IS NOT NULL DROP TABLE dbo.TaskSubmissions;
IF OBJECT_ID(N'dbo.Tasks', N'U') IS NOT NULL DROP TABLE dbo.Tasks;
IF OBJECT_ID(N'dbo.PortalNotifications', N'U') IS NOT NULL DROP TABLE dbo.PortalNotifications;
IF OBJECT_ID(N'dbo.EnrollmentApplications', N'U') IS NOT NULL DROP TABLE dbo.EnrollmentApplications;
IF OBJECT_ID(N'dbo.JobApplicants', N'U') IS NOT NULL DROP TABLE dbo.JobApplicants;
IF OBJECT_ID(N'dbo.CompanyPosts', N'U') IS NOT NULL DROP TABLE dbo.CompanyPosts;
IF OBJECT_ID(N'dbo.SectionEnrollments', N'U') IS NOT NULL DROP TABLE dbo.SectionEnrollments;
IF OBJECT_ID(N'dbo.TrainingSections', N'U') IS NOT NULL DROP TABLE dbo.TrainingSections;
IF OBJECT_ID(N'dbo.Trainings', N'U') IS NOT NULL DROP TABLE dbo.Trainings;
IF OBJECT_ID(N'dbo.Tracks', N'U') IS NOT NULL DROP TABLE dbo.Tracks;
IF OBJECT_ID(N'dbo.Branches', N'U') IS NOT NULL DROP TABLE dbo.Branches;
IF OBJECT_ID(N'dbo.RefStatuses', N'U') IS NOT NULL DROP TABLE dbo.RefStatuses;
IF OBJECT_ID(N'dbo.RefNotificationTones', N'U') IS NOT NULL DROP TABLE dbo.RefNotificationTones;
IF OBJECT_ID(N'dbo.RefCourseCategories', N'U') IS NOT NULL DROP TABLE dbo.RefCourseCategories;
IF OBJECT_ID(N'dbo.RefreshTokens', N'U') IS NOT NULL DROP TABLE dbo.RefreshTokens;
IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NOT NULL DROP TABLE dbo.AuditLogs;
IF OBJECT_ID(N'dbo.AspNetUserTokens', N'U') IS NOT NULL DROP TABLE dbo.AspNetUserTokens;
IF OBJECT_ID(N'dbo.AspNetUserRoles', N'U') IS NOT NULL DROP TABLE dbo.AspNetUserRoles;
IF OBJECT_ID(N'dbo.AspNetUserLogins', N'U') IS NOT NULL DROP TABLE dbo.AspNetUserLogins;
IF OBJECT_ID(N'dbo.AspNetUserClaims', N'U') IS NOT NULL DROP TABLE dbo.AspNetUserClaims;
IF OBJECT_ID(N'dbo.AspNetRoleClaims', N'U') IS NOT NULL DROP TABLE dbo.AspNetRoleClaims;
IF OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NOT NULL DROP TABLE dbo.AspNetUsers;
IF OBJECT_ID(N'dbo.AspNetRoles', N'U') IS NOT NULL DROP TABLE dbo.AspNetRoles;
IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NOT NULL DROP TABLE dbo.__EFMigrationsHistory;
GO

/* ═══════════════════════════════════════════════════════════════════════════
   REFERENCE / LOOKUP TABLES
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.RefStatuses (
    Id     TINYINT       NOT NULL,
    Domain NVARCHAR(32)  NOT NULL,
    Code   NVARCHAR(32)  NOT NULL,
    Label  NVARCHAR(64)  NOT NULL,
    CONSTRAINT PK_RefStatuses PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UX_RefStatuses_Domain_Code UNIQUE (Domain, Code)
);

CREATE TABLE dbo.RefNotificationTones (
    Code  NVARCHAR(32) NOT NULL,
    Label NVARCHAR(64) NOT NULL,
    CONSTRAINT PK_RefNotificationTones PRIMARY KEY CLUSTERED (Code)
);

CREATE TABLE dbo.RefCourseCategories (
    Code  NVARCHAR(32) NOT NULL,
    Label NVARCHAR(64) NOT NULL,
    CONSTRAINT PK_RefCourseCategories PRIMARY KEY CLUSTERED (Code)
);

CREATE TABLE dbo.RefTags (
    Id   INT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(64)     NOT NULL,
    CONSTRAINT PK_RefTags PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UX_RefTags_Name UNIQUE (Name)
);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   IDENTITY (ASP.NET Core Identity — unchanged contract)
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.AspNetRoles (
    Id NVARCHAR(450) NOT NULL, Name NVARCHAR(256) NULL, NormalizedName NVARCHAR(256) NULL,
    ConcurrencyStamp NVARCHAR(MAX) NULL,
    CONSTRAINT PK_AspNetRoles PRIMARY KEY CLUSTERED (Id)
);
CREATE UNIQUE INDEX UX_AspNetRoles_NormalizedName ON dbo.AspNetRoles (NormalizedName) WHERE NormalizedName IS NOT NULL;
GO

CREATE TABLE dbo.AspNetUsers (
    Id                    NVARCHAR(450) NOT NULL,
    FullName              NVARCHAR(120) NOT NULL,
    LegacyUserId          NVARCHAR(64)  NOT NULL,  /* API slug — sole legacy column */
    AssignedTrainerUserId NVARCHAR(450) NULL,
    CreatedAtUtc          DATETIME2(3)  NOT NULL CONSTRAINT DF_AspNetUsers_Created DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc          DATETIME2(3)  NOT NULL CONSTRAINT DF_AspNetUsers_Updated DEFAULT (SYSUTCDATETIME()),
    IsDeleted             BIT           NOT NULL CONSTRAINT DF_AspNetUsers_IsDeleted DEFAULT (0),
    DeletedAtUtc          DATETIME2(3)  NULL,
    UserName              NVARCHAR(256) NULL,
    NormalizedUserName    NVARCHAR(256) NULL,
    Email                 NVARCHAR(256) NULL,
    NormalizedEmail       NVARCHAR(256) NULL,
    EmailConfirmed        BIT NOT NULL CONSTRAINT DF_AspNetUsers_EmailConfirmed DEFAULT (0),
    PasswordHash          NVARCHAR(MAX) NULL,
    SecurityStamp         NVARCHAR(MAX) NULL,
    ConcurrencyStamp      NVARCHAR(MAX) NULL,
    PhoneNumber           NVARCHAR(MAX) NULL,
    PhoneNumberConfirmed  BIT NOT NULL CONSTRAINT DF_AspNetUsers_PhoneConfirmed DEFAULT (0),
    TwoFactorEnabled      BIT NOT NULL CONSTRAINT DF_AspNetUsers_2FA DEFAULT (0),
    LockoutEnd            DATETIMEOFFSET NULL,
    LockoutEnabled        BIT NOT NULL CONSTRAINT DF_AspNetUsers_Lockout DEFAULT (0),
    AccessFailedCount     INT NOT NULL CONSTRAINT DF_AspNetUsers_Failed DEFAULT (0),
    RowVersion            ROWVERSION    NOT NULL,
    CONSTRAINT PK_AspNetUsers PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_AspNetUsers_AssignedTrainer FOREIGN KEY (AssignedTrainerUserId)
        REFERENCES dbo.AspNetUsers (Id) ON DELETE NO ACTION,
    CONSTRAINT CK_AspNetUsers_AccessFailedCount CHECK (AccessFailedCount >= 0)
);
CREATE UNIQUE INDEX UX_AspNetUsers_NormalizedUserName ON dbo.AspNetUsers (NormalizedUserName) WHERE NormalizedUserName IS NOT NULL AND IsDeleted = 0;
CREATE INDEX IX_AspNetUsers_NormalizedEmail ON dbo.AspNetUsers (NormalizedEmail) WHERE IsDeleted = 0;
CREATE UNIQUE INDEX UX_AspNetUsers_LegacyUserId ON dbo.AspNetUsers (LegacyUserId) WHERE IsDeleted = 0;
CREATE INDEX IX_AspNetUsers_AssignedTrainerUserId ON dbo.AspNetUsers (AssignedTrainerUserId);
GO

CREATE TABLE dbo.AspNetRoleClaims (
    Id INT IDENTITY(1,1) NOT NULL, RoleId NVARCHAR(450) NOT NULL,
    ClaimType NVARCHAR(MAX) NULL, ClaimValue NVARCHAR(MAX) NULL,
    CONSTRAINT PK_AspNetRoleClaims PRIMARY KEY (Id),
    CONSTRAINT FK_AspNetRoleClaims_RoleId FOREIGN KEY (RoleId) REFERENCES dbo.AspNetRoles(Id) ON DELETE CASCADE
);
CREATE INDEX IX_AspNetRoleClaims_RoleId ON dbo.AspNetRoleClaims (RoleId);

CREATE TABLE dbo.AspNetUserClaims (
    Id INT IDENTITY(1,1) NOT NULL, UserId NVARCHAR(450) NOT NULL,
    ClaimType NVARCHAR(MAX) NULL, ClaimValue NVARCHAR(MAX) NULL,
    CONSTRAINT PK_AspNetUserClaims PRIMARY KEY (Id),
    CONSTRAINT FK_AspNetUserClaims_UserId FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE
);
CREATE INDEX IX_AspNetUserClaims_UserId ON dbo.AspNetUserClaims (UserId);

CREATE TABLE dbo.AspNetUserLogins (
    LoginProvider NVARCHAR(128) NOT NULL, ProviderKey NVARCHAR(128) NOT NULL,
    ProviderDisplayName NVARCHAR(MAX) NULL, UserId NVARCHAR(450) NOT NULL,
    CONSTRAINT PK_AspNetUserLogins PRIMARY KEY (LoginProvider, ProviderKey),
    CONSTRAINT FK_AspNetUserLogins_UserId FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE
);
CREATE INDEX IX_AspNetUserLogins_UserId ON dbo.AspNetUserLogins (UserId);

CREATE TABLE dbo.AspNetUserRoles (
    UserId NVARCHAR(450) NOT NULL, RoleId NVARCHAR(450) NOT NULL,
    CONSTRAINT PK_AspNetUserRoles PRIMARY KEY NONCLUSTERED (UserId, RoleId),
    CONSTRAINT FK_AspNetUserRoles_RoleId FOREIGN KEY (RoleId) REFERENCES dbo.AspNetRoles(Id) ON DELETE CASCADE,
    CONSTRAINT FK_AspNetUserRoles_UserId FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE
);
CREATE INDEX IX_AspNetUserRoles_RoleId ON dbo.AspNetUserRoles (RoleId);

CREATE TABLE dbo.AspNetUserTokens (
    UserId NVARCHAR(450) NOT NULL, LoginProvider NVARCHAR(128) NOT NULL,
    Name NVARCHAR(128) NOT NULL, Value NVARCHAR(MAX) NULL,
    CONSTRAINT PK_AspNetUserTokens PRIMARY KEY NONCLUSTERED (UserId, LoginProvider, Name),
    CONSTRAINT FK_AspNetUserTokens_UserId FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.AuditLogs (
    Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    EventType INT NOT NULL, UserId NVARCHAR(450) NULL, Email NVARCHAR(256) NULL,
    IpAddress NVARCHAR(64) NULL, UserAgent NVARCHAR(512) NULL, Details NVARCHAR(2000) NULL,
    Success BIT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL,
    CONSTRAINT PK_AuditLogs PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_AuditLogs_UserId FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE SET NULL
);
CREATE INDEX IX_AuditLogs_UserId ON dbo.AuditLogs (UserId);
CREATE INDEX IX_AuditLogs_CreatedAtUtc ON dbo.AuditLogs (CreatedAtUtc DESC);
CREATE INDEX IX_AuditLogs_EventType_CreatedAtUtc ON dbo.AuditLogs (EventType, CreatedAtUtc DESC);

CREATE TABLE dbo.RefreshTokens (
    Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    UserId NVARCHAR(450) NOT NULL, TokenHash NVARCHAR(128) NOT NULL,
    CreatedAtUtc DATETIME2(3) NOT NULL, ExpiresAtUtc DATETIME2(3) NOT NULL,
    RevokedAtUtc DATETIME2(3) NULL, ReplacedByTokenHash NVARCHAR(128) NULL,
    CreatedByIp NVARCHAR(64) NULL,
    CONSTRAINT PK_RefreshTokens PRIMARY KEY (Id),
    CONSTRAINT FK_RefreshTokens_UserId FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE,
    CONSTRAINT CK_RefreshTokens_Expiry CHECK (ExpiresAtUtc > CreatedAtUtc)
);
CREATE UNIQUE INDEX UX_RefreshTokens_TokenHash ON dbo.RefreshTokens (TokenHash);
CREATE INDEX IX_RefreshTokens_UserId_ExpiresAtUtc ON dbo.RefreshTokens (UserId, ExpiresAtUtc);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   CATALOG
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.Branches (
    Id NVARCHAR(64) NOT NULL, Name NVARCHAR(120) NOT NULL, Region NVARCHAR(120) NULL,
    CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Branches_Created DEFAULT (SYSUTCDATETIME()),
    IsDeleted BIT NOT NULL CONSTRAINT DF_Branches_IsDeleted DEFAULT (0),
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_Branches PRIMARY KEY CLUSTERED (Id)
);

CREATE TABLE dbo.Tracks (
    Id NVARCHAR(64) NOT NULL, BranchId NVARCHAR(64) NOT NULL,
    Title NVARCHAR(200) NOT NULL, Icon NVARCHAR(32) NULL, IsActive BIT NOT NULL DEFAULT (1),
    CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Tracks_Created DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Tracks_Updated DEFAULT (SYSUTCDATETIME()),
    IsDeleted BIT NOT NULL CONSTRAINT DF_Tracks_IsDeleted DEFAULT (0),
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_Tracks PRIMARY KEY (Id),
    CONSTRAINT FK_Tracks_BranchId FOREIGN KEY (BranchId) REFERENCES dbo.Branches(Id) ON DELETE NO ACTION
);
CREATE INDEX IX_Tracks_BranchId_IsActive ON dbo.Tracks (BranchId, IsActive) WHERE IsDeleted = 0;

CREATE TABLE dbo.Trainings (
    Id NVARCHAR(64) NOT NULL, BranchId NVARCHAR(64) NOT NULL, TrackId NVARCHAR(64) NULL,
    CategoryCode NVARCHAR(32) NOT NULL, Title NVARCHAR(300) NOT NULL, Body NVARCHAR(MAX) NULL,
    StartDate DATE NULL, Location NVARCHAR(200) NULL, TrainerUserId NVARCHAR(450) NULL,
    SeatsTaken INT NOT NULL CONSTRAINT DF_Trainings_SeatsTaken DEFAULT (0),
    SeatsTotal INT NOT NULL CONSTRAINT DF_Trainings_SeatsTotal DEFAULT (0),
    StatusId TINYINT NOT NULL, FilterTag NVARCHAR(32) NULL,
    CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Trainings_Created DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Trainings_Updated DEFAULT (SYSUTCDATETIME()),
    CreatedByUserId NVARCHAR(450) NULL, UpdatedByUserId NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_Trainings_IsDeleted DEFAULT (0),
    DeletedAtUtc DATETIME2(3) NULL, RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_Trainings PRIMARY KEY (Id),
    CONSTRAINT FK_Trainings_BranchId FOREIGN KEY (BranchId) REFERENCES dbo.Branches(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Trainings_TrackId FOREIGN KEY (TrackId) REFERENCES dbo.Tracks(Id) ON DELETE SET NULL,
    CONSTRAINT FK_Trainings_TrainerUserId FOREIGN KEY (TrainerUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Trainings_CategoryCode FOREIGN KEY (CategoryCode) REFERENCES dbo.RefCourseCategories(Code),
    CONSTRAINT FK_Trainings_StatusId FOREIGN KEY (StatusId) REFERENCES dbo.RefStatuses(Id),
    CONSTRAINT FK_Trainings_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Trainings_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT CK_Trainings_Seats CHECK (SeatsTaken >= 0 AND SeatsTotal >= 0 AND SeatsTaken <= SeatsTotal)
);
CREATE INDEX IX_Trainings_BranchId_StatusId ON dbo.Trainings (BranchId, StatusId) WHERE IsDeleted = 0;
CREATE INDEX IX_Trainings_TrackId ON dbo.Trainings (TrackId);
CREATE INDEX IX_Trainings_TrainerUserId ON dbo.Trainings (TrainerUserId);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   TRAINER WORKSPACE
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.TrainingSections (
    Id NVARCHAR(128) NOT NULL, Title NVARCHAR(300) NOT NULL, Company NVARCHAR(120) NULL,
    DurationLabel NVARCHAR(64) NULL, StatusId TINYINT NOT NULL,
    TrainerUserId NVARCHAR(450) NOT NULL,
    CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Sections_Created DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Sections_Updated DEFAULT (SYSUTCDATETIME()),
    IsDeleted BIT NOT NULL CONSTRAINT DF_Sections_IsDeleted DEFAULT (0),
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_TrainingSections PRIMARY KEY (Id),
    CONSTRAINT FK_TrainingSections_TrainerUserId FOREIGN KEY (TrainerUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_TrainingSections_StatusId FOREIGN KEY (StatusId) REFERENCES dbo.RefStatuses(Id)
);
CREATE INDEX IX_TrainingSections_TrainerUserId_StatusId ON dbo.TrainingSections (TrainerUserId, StatusId) WHERE IsDeleted = 0;

CREATE TABLE dbo.SectionEnrollments (
    SectionId NVARCHAR(128) NOT NULL, StudentUserId NVARCHAR(450) NOT NULL,
    ProgressPercent INT NOT NULL CONSTRAINT DF_SectionEnroll_Progress DEFAULT (0),
    CompletedTasks INT NOT NULL CONSTRAINT DF_SectionEnroll_Completed DEFAULT (0),
    TotalTasks INT NOT NULL CONSTRAINT DF_SectionEnroll_Total DEFAULT (0),
    EnrolledAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_SectionEnroll_Enrolled DEFAULT (SYSUTCDATETIME()),
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_SectionEnrollments PRIMARY KEY NONCLUSTERED (SectionId, StudentUserId),
    CONSTRAINT FK_SectionEnrollments_SectionId FOREIGN KEY (SectionId) REFERENCES dbo.TrainingSections(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SectionEnrollments_StudentUserId FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT CK_SectionEnrollments_Progress CHECK (ProgressPercent BETWEEN 0 AND 100),
    CONSTRAINT CK_SectionEnrollments_Tasks CHECK (CompletedTasks >= 0 AND TotalTasks >= 0 AND CompletedTasks <= TotalTasks)
);
CREATE INDEX IX_SectionEnrollments_StudentUserId ON dbo.SectionEnrollments (StudentUserId);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   COMPANY POSTS & APPLICANTS
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.CompanyPosts (
    Id NVARCHAR(64) NOT NULL, BranchId NVARCHAR(64) NOT NULL, Title NVARCHAR(300) NOT NULL,
    StatusId TINYINT NOT NULL, Body NVARCHAR(MAX) NULL, TrainingTitle NVARCHAR(300) NULL,
    Deadline DATE NULL,
    CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_CompanyPosts_Created DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_CompanyPosts_Updated DEFAULT (SYSUTCDATETIME()),
    IsDeleted BIT NOT NULL CONSTRAINT DF_CompanyPosts_IsDeleted DEFAULT (0),
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_CompanyPosts PRIMARY KEY (Id),
    CONSTRAINT FK_CompanyPosts_BranchId FOREIGN KEY (BranchId) REFERENCES dbo.Branches(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_CompanyPosts_StatusId FOREIGN KEY (StatusId) REFERENCES dbo.RefStatuses(Id)
);
CREATE INDEX IX_CompanyPosts_BranchId_StatusId ON dbo.CompanyPosts (BranchId, StatusId) WHERE IsDeleted = 0;

CREATE TABLE dbo.CompanyPostTags (
    PostId NVARCHAR(64) NOT NULL, TagId INT NOT NULL,
    CONSTRAINT PK_CompanyPostTags PRIMARY KEY (PostId, TagId),
    CONSTRAINT FK_CompanyPostTags_PostId FOREIGN KEY (PostId) REFERENCES dbo.CompanyPosts(Id) ON DELETE CASCADE,
    CONSTRAINT FK_CompanyPostTags_TagId FOREIGN KEY (TagId) REFERENCES dbo.RefTags(Id) ON DELETE CASCADE
);
CREATE INDEX IX_CompanyPostTags_TagId ON dbo.CompanyPostTags (TagId);

CREATE TABLE dbo.JobApplicants (
    Id NVARCHAR(64) NOT NULL, BranchId NVARCHAR(64) NOT NULL,
    ApplicantUserId NVARCHAR(450) NULL,
    ApplicantInitial NVARCHAR(4) NULL, FullName NVARCHAR(120) NOT NULL, Email NVARCHAR(256) NOT NULL,
    TrainingTitle NVARCHAR(300) NULL, StatusId TINYINT NOT NULL, AppliedOn DATE NULL,
    CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_JobApplicants_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_JobApplicants PRIMARY KEY (Id),
    CONSTRAINT FK_JobApplicants_BranchId FOREIGN KEY (BranchId) REFERENCES dbo.Branches(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_JobApplicants_StatusId FOREIGN KEY (StatusId) REFERENCES dbo.RefStatuses(Id),
    CONSTRAINT FK_JobApplicants_ApplicantUserId FOREIGN KEY (ApplicantUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE SET NULL
);
CREATE INDEX IX_JobApplicants_BranchId_StatusId ON dbo.JobApplicants (BranchId, StatusId);
CREATE INDEX IX_JobApplicants_ApplicantUserId ON dbo.JobApplicants (ApplicantUserId);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   ENROLLMENTS
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.EnrollmentApplications (
    Id NVARCHAR(64) NOT NULL,
    StudentUserId NVARCHAR(450) NOT NULL, BranchId NVARCHAR(64) NOT NULL,
    CourseId NVARCHAR(64) NOT NULL, TrainerUserId NVARCHAR(450) NOT NULL,
    MotivationReason NVARCHAR(MAX) NULL, UniversityName NVARCHAR(200) NULL,
    Major NVARCHAR(120) NULL, Gpa NVARCHAR(16) NULL, PreviousStudies NVARCHAR(MAX) NULL,
    CvFileName NVARCHAR(260) NULL, CvFileUrl NVARCHAR(500) NULL,
    StatusId TINYINT NOT NULL, RejectionReason NVARCHAR(MAX) NULL,
    ReviewedAtUtc DATETIME2(3) NULL, ReviewedByUserId NVARCHAR(450) NULL,
    CreatedAtUtc DATETIME2(3) NOT NULL, UpdatedAtUtc DATETIME2(3) NOT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_Enrollment_IsDeleted DEFAULT (0),
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_EnrollmentApplications PRIMARY KEY (Id),
    CONSTRAINT FK_Enrollment_StudentUserId FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Enrollment_BranchId FOREIGN KEY (BranchId) REFERENCES dbo.Branches(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Enrollment_CourseId FOREIGN KEY (CourseId) REFERENCES dbo.Trainings(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Enrollment_TrainerUserId FOREIGN KEY (TrainerUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Enrollment_StatusId FOREIGN KEY (StatusId) REFERENCES dbo.RefStatuses(Id),
    CONSTRAINT FK_Enrollment_ReviewedBy FOREIGN KEY (ReviewedByUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE SET NULL
);
CREATE INDEX IX_Enrollment_StudentUserId ON dbo.EnrollmentApplications (StudentUserId);
CREATE INDEX IX_Enrollment_TrainerUserId_StatusId ON dbo.EnrollmentApplications (TrainerUserId, StatusId) WHERE IsDeleted = 0;
CREATE INDEX IX_Enrollment_CourseId ON dbo.EnrollmentApplications (CourseId);
CREATE UNIQUE INDEX UX_Enrollment_ActiveStudentCourse
    ON dbo.EnrollmentApplications (StudentUserId, CourseId)
    WHERE IsDeleted = 0 AND StatusId IN (1, 2); /* pending + approved — see seed */

CREATE TABLE dbo.PortalNotifications (
    Id NVARCHAR(64) NOT NULL, UserId NVARCHAR(450) NOT NULL,
    Title NVARCHAR(200) NOT NULL, Message NVARCHAR(MAX) NOT NULL,
    ToneCode NVARCHAR(32) NOT NULL, IsRead BIT NOT NULL DEFAULT (0),
    CreatedAtUtc DATETIME2(3) NOT NULL, TypeCode NVARCHAR(64) NOT NULL,
    ApplicationId NVARCHAR(64) NULL, BranchId NVARCHAR(64) NULL, CourseId NVARCHAR(64) NULL,
    TargetView NVARCHAR(64) NOT NULL,
    CONSTRAINT PK_PortalNotifications PRIMARY KEY (Id),
    CONSTRAINT FK_Notifications_UserId FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Notifications_ToneCode FOREIGN KEY (ToneCode) REFERENCES dbo.RefNotificationTones(Code),
    CONSTRAINT FK_Notifications_ApplicationId FOREIGN KEY (ApplicationId) REFERENCES dbo.EnrollmentApplications(Id) ON DELETE SET NULL,
    CONSTRAINT FK_Notifications_BranchId FOREIGN KEY (BranchId) REFERENCES dbo.Branches(Id) ON DELETE SET NULL,
    CONSTRAINT FK_Notifications_CourseId FOREIGN KEY (CourseId) REFERENCES dbo.Trainings(Id) ON DELETE SET NULL
);
CREATE INDEX IX_Notifications_UserId_IsRead_Created ON dbo.PortalNotifications (UserId, IsRead, CreatedAtUtc DESC);
CREATE INDEX IX_Notifications_ApplicationId ON dbo.PortalNotifications (ApplicationId);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   TASKS
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.Tasks (
    Id NVARCHAR(64) NOT NULL, StudentUserId NVARCHAR(450) NOT NULL,
    SectionId NVARCHAR(128) NULL, Title NVARCHAR(300) NOT NULL, Description NVARCHAR(MAX) NULL,
    DeadlineUtc DATETIME2(3) NOT NULL, StatusId TINYINT NOT NULL,
    LastSubmissionId NVARCHAR(64) NULL,
    CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Tasks_Created DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Tasks_Updated DEFAULT (SYSUTCDATETIME()),
    IsDeleted BIT NOT NULL CONSTRAINT DF_Tasks_IsDeleted DEFAULT (0),
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_Tasks PRIMARY KEY (Id),
    CONSTRAINT FK_Tasks_StudentUserId FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Tasks_SectionId FOREIGN KEY (SectionId) REFERENCES dbo.TrainingSections(Id) ON DELETE SET NULL,
    CONSTRAINT FK_Tasks_StatusId FOREIGN KEY (StatusId) REFERENCES dbo.RefStatuses(Id)
);
CREATE INDEX IX_Tasks_StudentUserId_Deadline ON dbo.Tasks (StudentUserId, DeadlineUtc) WHERE IsDeleted = 0;
CREATE INDEX IX_Tasks_SectionId ON dbo.Tasks (SectionId);

CREATE TABLE dbo.TaskSubmissions (
    Id NVARCHAR(64) NOT NULL, StudentUserId NVARCHAR(450) NOT NULL,
    TaskId NVARCHAR(64) NOT NULL, SubmissionLink NVARCHAR(500) NULL,
    FileName NVARCHAR(260) NULL, Notes NVARCHAR(MAX) NULL,
    SubmittedAtUtc DATETIME2(3) NOT NULL,
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_TaskSubmissions PRIMARY KEY (Id),
    CONSTRAINT FK_Submissions_StudentUserId FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Submissions_TaskId FOREIGN KEY (TaskId) REFERENCES dbo.Tasks(Id) ON DELETE CASCADE
);
CREATE INDEX IX_Submissions_TaskId_SubmittedAt ON dbo.TaskSubmissions (TaskId, SubmittedAtUtc DESC);
CREATE INDEX IX_Submissions_StudentUserId ON dbo.TaskSubmissions (StudentUserId);

/* LastSubmissionId is a denormalized pointer — no FK (Tasks↔Submissions cycle in SQL Server). */
CREATE INDEX IX_Tasks_LastSubmissionId ON dbo.Tasks (LastSubmissionId) WHERE LastSubmissionId IS NOT NULL;
GO

/* Clear LastSubmissionId when a submission row is removed. */
CREATE TRIGGER dbo.TR_TaskSubmissions_ClearLastRef
ON dbo.TaskSubmissions
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE t SET LastSubmissionId = NULL
    FROM dbo.Tasks t
    INNER JOIN deleted d ON t.LastSubmissionId = d.Id;
END;
GO

/* ═══════════════════════════════════════════════════════════════════════════
   MESSAGING, FEEDBACK, EVALUATIONS
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.Messages (
    Id NVARCHAR(64) NOT NULL,
    SenderUserId NVARCHAR(450) NOT NULL, ReceiverUserId NVARCHAR(450) NOT NULL,
    SenderRole NVARCHAR(32) NOT NULL, ReceiverRole NVARCHAR(32) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL, TaskId NVARCHAR(64) NULL,
    TimestampUtc DATETIME2(3) NOT NULL,
    CONSTRAINT PK_Messages PRIMARY KEY (Id),
    CONSTRAINT FK_Messages_SenderUserId FOREIGN KEY (SenderUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Messages_ReceiverUserId FOREIGN KEY (ReceiverUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Messages_TaskId FOREIGN KEY (TaskId) REFERENCES dbo.Tasks(Id) ON DELETE SET NULL,
    CONSTRAINT CK_Messages_DifferentUsers CHECK (SenderUserId <> ReceiverUserId)
);
CREATE INDEX IX_Messages_SenderUserId_Time ON dbo.Messages (SenderUserId, TimestampUtc DESC);
CREATE INDEX IX_Messages_ReceiverUserId_Time ON dbo.Messages (ReceiverUserId, TimestampUtc DESC);
CREATE INDEX IX_Messages_TaskId ON dbo.Messages (TaskId);

CREATE TABLE dbo.TrainerFeedback (
    Id NVARCHAR(64) NOT NULL, StudentUserId NVARCHAR(450) NOT NULL,
    TrainerUserId NVARCHAR(450) NULL, TaskId NVARCHAR(64) NULL,
    Comment NVARCHAR(MAX) NOT NULL, Grade NVARCHAR(16) NULL,
    AtUtc DATETIME2(3) NOT NULL, RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_TrainerFeedback PRIMARY KEY (Id),
    CONSTRAINT FK_Feedback_StudentUserId FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Feedback_TrainerUserId FOREIGN KEY (TrainerUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE SET NULL,
    CONSTRAINT FK_Feedback_TaskId FOREIGN KEY (TaskId) REFERENCES dbo.Tasks(Id) ON DELETE SET NULL
);
CREATE INDEX IX_Feedback_StudentUserId_AtUtc ON dbo.TrainerFeedback (StudentUserId, AtUtc DESC);
CREATE INDEX IX_Feedback_TrainerUserId ON dbo.TrainerFeedback (TrainerUserId);
CREATE INDEX IX_Feedback_TaskId ON dbo.TrainerFeedback (TaskId);

CREATE TABLE dbo.TraineeEvaluations (
    Id NVARCHAR(64) NOT NULL, StudentUserId NVARCHAR(450) NULL,
    DisplayName NVARCHAR(120) NOT NULL,
    CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Eval_Created DEFAULT (SYSUTCDATETIME()),
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_TraineeEvaluations PRIMARY KEY (Id),
    CONSTRAINT FK_Eval_StudentUserId FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE SET NULL
);
CREATE INDEX IX_Eval_StudentUserId ON dbo.TraineeEvaluations (StudentUserId);

CREATE TABLE dbo.EvaluationTaskItems (
    Id NVARCHAR(64) NOT NULL, EvaluationId NVARCHAR(64) NOT NULL,
    Title NVARCHAR(300) NOT NULL, Deadline DATE NULL, SubmittedOn DATE NULL,
    RepoTag NVARCHAR(120) NULL, RepoBranch NVARCHAR(64) NULL, StatusId TINYINT NOT NULL,
    CONSTRAINT PK_EvaluationTaskItems PRIMARY KEY (Id),
    CONSTRAINT FK_EvalItems_EvaluationId FOREIGN KEY (EvaluationId) REFERENCES dbo.TraineeEvaluations(Id) ON DELETE CASCADE,
    CONSTRAINT FK_EvalItems_StatusId FOREIGN KEY (StatusId) REFERENCES dbo.RefStatuses(Id)
);
CREATE INDEX IX_EvalItems_EvaluationId ON dbo.EvaluationTaskItems (EvaluationId);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   INTERNSHIPS
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.InternshipPrograms (
    Id NVARCHAR(64) NOT NULL, Title NVARCHAR(300) NOT NULL, Company NVARCHAR(120) NOT NULL,
    Specialization NVARCHAR(120) NOT NULL, TrainingType NVARCHAR(64) NOT NULL,
    Summary NVARCHAR(MAX) NULL, OpensOnUtc DATETIME2(3) NOT NULL, ClosesOnUtc DATETIME2(3) NOT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_InternPrograms_IsDeleted DEFAULT (0),
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_InternshipPrograms PRIMARY KEY (Id),
    CONSTRAINT CK_InternshipPrograms_Dates CHECK (ClosesOnUtc > OpensOnUtc)
);

CREATE TABLE dbo.InternshipApplications (
    Id NVARCHAR(64) NOT NULL, StudentUserId NVARCHAR(450) NOT NULL,
    ProgramId NVARCHAR(64) NOT NULL, StatusId TINYINT NOT NULL,
    CoverLetter NVARCHAR(MAX) NULL, CvFileName NVARCHAR(260) NULL,
    CreatedAtUtc DATETIME2(3) NOT NULL, RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_InternshipApplications PRIMARY KEY (Id),
    CONSTRAINT FK_InternApps_StudentUserId FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_InternApps_ProgramId FOREIGN KEY (ProgramId) REFERENCES dbo.InternshipPrograms(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_InternApps_StatusId FOREIGN KEY (StatusId) REFERENCES dbo.RefStatuses(Id)
);
CREATE INDEX IX_InternApps_StudentUserId ON dbo.InternshipApplications (StudentUserId);
CREATE INDEX IX_InternApps_ProgramId_StatusId ON dbo.InternshipApplications (ProgramId, StatusId);

CREATE TABLE dbo.InternshipApplicationTimelineSteps (
    Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    ApplicationId NVARCHAR(64) NOT NULL, StepOrder INT NOT NULL,
    Label NVARCHAR(200) NOT NULL, State NVARCHAR(64) NOT NULL, AtUtc DATETIME2(3) NOT NULL,
    CONSTRAINT PK_InternTimeline PRIMARY KEY (Id),
    CONSTRAINT FK_InternTimeline_ApplicationId FOREIGN KEY (ApplicationId) REFERENCES dbo.InternshipApplications(Id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX UX_InternTimeline_App_Step ON dbo.InternshipApplicationTimelineSteps (ApplicationId, StepOrder);
CREATE INDEX IX_InternTimeline_ApplicationId ON dbo.InternshipApplicationTimelineSteps (ApplicationId);
GO

CREATE TABLE dbo.__EFMigrationsHistory (
    MigrationId NVARCHAR(150) NOT NULL, ProductVersion NVARCHAR(32) NOT NULL,
    CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY (MigrationId)
);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   COMPATIBILITY VIEWS (API backward-compat for v2 denormalized fields)
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE VIEW dbo.vw_EnrollmentApplications_Detail AS
SELECT
    e.Id, e.StudentUserId,
    su.LegacyUserId  AS UserLegacyId,
    su.Email         AS UserEmail,
    su.FullName      AS UserName,
    e.BranchId, e.CourseId,
    t.Title          AS CourseTitle,
    e.TrainerUserId,
    tu.LegacyUserId  AS TrainerLegacyId,
    tu.Email         AS TrainerEmail,
    tu.FullName      AS TrainerName,
    rs.Code          AS Status,
    e.MotivationReason, e.UniversityName, e.Major, e.Gpa, e.PreviousStudies,
    e.CvFileName, e.CvFileUrl, e.RejectionReason,
    e.ReviewedAtUtc, e.ReviewedByUserId,
    e.CreatedAtUtc, e.UpdatedAtUtc
FROM dbo.EnrollmentApplications e
INNER JOIN dbo.AspNetUsers su ON su.Id = e.StudentUserId
INNER JOIN dbo.Trainings t ON t.Id = e.CourseId
INNER JOIN dbo.AspNetUsers tu ON tu.Id = e.TrainerUserId
INNER JOIN dbo.RefStatuses rs ON rs.Id = e.StatusId
WHERE e.IsDeleted = 0;
GO

CREATE VIEW dbo.vw_TrackStats AS
SELECT
    tr.Id AS TrackId, tr.BranchId, tr.Title,
    TrainingsCount = (SELECT COUNT(*) FROM dbo.Trainings tn WHERE tn.TrackId = tr.Id AND tn.IsDeleted = 0),
    StudentsCount  = (SELECT COUNT(DISTINCT ea.StudentUserId)
                    FROM dbo.EnrollmentApplications ea
                    INNER JOIN dbo.Trainings tn ON tn.Id = ea.CourseId
                    WHERE tn.TrackId = tr.Id AND ea.IsDeleted = 0 AND ea.StatusId = 2)
FROM dbo.Tracks tr WHERE tr.IsDeleted = 0;
GO

CREATE VIEW dbo.vw_SectionStats AS
SELECT
    s.Id AS SectionId,
    TasksCount = (SELECT COUNT(*) FROM dbo.Tasks tk WHERE tk.SectionId = s.Id AND tk.IsDeleted = 0),
    StudentsCount = (SELECT COUNT(*) FROM dbo.SectionEnrollments se WHERE se.SectionId = s.Id)
FROM dbo.TrainingSections s WHERE s.IsDeleted = 0;
GO

CREATE VIEW dbo.vw_PortalNotifications_Detail AS
SELECT
    n.Id, n.UserId, u.LegacyUserId AS UserLegacyId,
    n.Title, n.Message, n.ToneCode AS Tone, n.IsRead, n.CreatedAtUtc,
    n.TypeCode AS Type, n.ApplicationId, n.BranchId, n.CourseId,
    t.Title AS CourseTitle, n.TargetView
FROM dbo.PortalNotifications n
INNER JOIN dbo.AspNetUsers u ON u.Id = n.UserId
LEFT JOIN dbo.Trainings t ON t.Id = n.CourseId;
GO

CREATE VIEW dbo.vw_Tasks_Detail AS
SELECT
    t.Id, t.StudentUserId, u.LegacyUserId AS StudentLegacyId,
    t.SectionId, t.Title, t.Description, t.DeadlineUtc,
    rs.Code AS SubmissionStatus, t.LastSubmissionId
FROM dbo.Tasks t
INNER JOIN dbo.AspNetUsers u ON u.Id = t.StudentUserId
INNER JOIN dbo.RefStatuses rs ON rs.Id = t.StatusId
WHERE t.IsDeleted = 0;
GO

CREATE VIEW dbo.vw_Messages_Detail AS
SELECT
    m.Id, m.SenderUserId, su.LegacyUserId AS SenderLegacyId,
    m.ReceiverUserId, ru.LegacyUserId AS ReceiverLegacyId,
    m.SenderRole, m.ReceiverRole, m.Content, m.TaskId, m.TimestampUtc
FROM dbo.Messages m
INNER JOIN dbo.AspNetUsers su ON su.Id = m.SenderUserId
INNER JOIN dbo.AspNetUsers ru ON ru.Id = m.ReceiverUserId;
GO

CREATE VIEW dbo.vw_TraineeEvaluations_Detail AS
SELECT
    e.Id, e.StudentUserId,
    u.LegacyUserId AS StudentLegacyId,
    e.DisplayName AS TraineeName,
    PendingCount = (
        SELECT COUNT(*) FROM dbo.EvaluationTaskItems i
        WHERE i.EvaluationId = e.Id AND i.StatusId = 21
    )
FROM dbo.TraineeEvaluations e
LEFT JOIN dbo.AspNetUsers u ON u.Id = e.StudentUserId;
GO

CREATE VIEW dbo.vw_CompanyPosts_Detail AS
SELECT
    p.Id, p.BranchId, p.Title, rs.Code AS Status, p.Body, p.TrainingTitle,
    p.Deadline,
    ApplicantsCount = (SELECT COUNT(*) FROM dbo.JobApplicants ja WHERE ja.BranchId = p.BranchId),
    Tags = STUFF((
        SELECT N',' + tg.Name
        FROM dbo.CompanyPostTags pt
        INNER JOIN dbo.RefTags tg ON tg.Id = pt.TagId
        WHERE pt.PostId = p.Id
        FOR XML PATH(''), TYPE
    ).value(N'.', N'NVARCHAR(MAX)'), 1, 1, N'')
FROM dbo.CompanyPosts p
INNER JOIN dbo.RefStatuses rs ON rs.Id = p.StatusId
WHERE p.IsDeleted = 0;
GO

CREATE VIEW dbo.vw_Trainings_Detail AS
SELECT
    t.Id, t.BranchId, t.TrackId, t.CategoryCode AS Category, t.Title, t.Body,
    t.StartDate, t.Location, t.TrainerUserId,
    u.LegacyUserId AS TrainerLegacyId, u.Email AS TrainerEmail,
    u.FullName AS TrainerName,
    LEFT(u.FullName, 2) AS TrainerInitials,
    t.SeatsTaken, t.SeatsTotal, rs.Code AS Status, t.FilterTag
FROM dbo.Trainings t
INNER JOIN dbo.RefStatuses rs ON rs.Id = t.StatusId
LEFT JOIN dbo.AspNetUsers u ON u.Id = t.TrainerUserId
WHERE t.IsDeleted = 0;
GO

CREATE VIEW dbo.vw_TrainerFeedback_Detail AS
SELECT
    f.Id, f.StudentUserId, su.LegacyUserId AS StudentLegacyId,
    f.TrainerUserId, tu.FullName AS TrainerName,
    tk.Title AS TaskTitle, f.Comment, f.Grade, f.AtUtc
FROM dbo.TrainerFeedback f
INNER JOIN dbo.AspNetUsers su ON su.Id = f.StudentUserId
LEFT JOIN dbo.AspNetUsers tu ON tu.Id = f.TrainerUserId
LEFT JOIN dbo.Tasks tk ON tk.Id = f.TaskId;
GO

/* ═══════════════════════════════════════════════════════════════════════════
   SEED — Lookups
   ═══════════════════════════════════════════════════════════════════════════ */
INSERT INTO dbo.RefStatuses (Id, Domain, Code, Label) VALUES
(1,  N'Enrollment',   N'pending',             N'Pending'),
(2,  N'Enrollment',   N'approved',            N'Approved'),
(3,  N'Enrollment',   N'rejected',            N'Rejected'),
(4,  N'Training',     N'active',              N'Active'),
(5,  N'Training',     N'upcoming',            N'Upcoming'),
(6,  N'Training',     N'completed',           N'Completed'),
(7,  N'Section',      N'active',              N'Active'),
(8,  N'Section',      N'completed',           N'Completed'),
(9,  N'Task',         N'not_submitted',       N'Not Submitted'),
(10, N'Task',         N'pending_review',      N'Pending Review'),
(11, N'Task',         N'completed',           N'Completed'),
(12, N'Task',         N'overdue',             N'Overdue'),
(13, N'Post',         N'published',           N'Published'),
(14, N'Post',         N'pending',             N'Pending'),
(15, N'Applicant',    N'pending',             N'Pending'),
(16, N'Applicant',    N'interviewed',         N'Interviewed'),
(17, N'Applicant',    N'approved',            N'Approved'),
(18, N'Applicant',    N'rejected',            N'Rejected'),
(19, N'Internship',   N'pending',             N'Pending'),
(20, N'Evaluation',   N'evaluated',           N'Evaluated'),
(21, N'Evaluation',   N'pending_evaluation',  N'Pending Evaluation'),
(22, N'Evaluation',   N'not_submitted',       N'Not Submitted');

INSERT INTO dbo.RefNotificationTones (Code, Label) VALUES
(N'info', N'Info'), (N'success', N'Success'), (N'warning', N'Warning'), (N'danger', N'Danger');

INSERT INTO dbo.RefCourseCategories (Code, Label) VALUES
(N'FRONTEND', N'Frontend'), (N'BACKEND', N'Backend'), (N'MOBILE', N'Mobile'), (N'DATA', N'Data & AI');

INSERT INTO dbo.RefTags (Name) VALUES
(N'React'), (N'TypeScript'), (N'CSS'), (N'Git'), (N'Node.js'), (N'PostgreSQL'),
(N'REST API'), (N'Docker'), (N'AWS'), (N'Linux'), (N'CI/CD');
GO

/* ═══════════════════════════════════════════════════════════════════════════
   SEED — Identity (same stable GUIDs as v2)
   ═══════════════════════════════════════════════════════════════════════════ */
DECLARE @U_Admin   NVARCHAR(450)=N'94d3ac02-9d0b-499f-8247-9a0c1e2d7c10';
DECLARE @U_T2000   NVARCHAR(450)=N'2b39681f-a083-4975-ab81-be88ffc750c7';
DECLARE @U_T2003   NVARCHAR(450)=N'1025fadc-970e-461c-a3ae-a1203f4ad711';
DECLARE @U_Mohamed NVARCHAR(450)=N'f22f369d-74cc-4598-b0a9-97497a0e69f7';
DECLARE @U_Sara    NVARCHAR(450)=N'9c6a3950-56f4-47ca-8a78-e8aa90b4ea32';
DECLARE @U_Hassan  NVARCHAR(450)=N'e59cf774-cebd-448a-acc0-20f5724288b4';
DECLARE @R_Admin   NVARCHAR(450)=N'd277b99b-f0e3-4f8d-a712-3afeeabb7ec4';
DECLARE @R_Student NVARCHAR(450)=N'ca1e6f1d-51de-4792-aced-489c2545c6c9';
DECLARE @R_Trainer NVARCHAR(450)=N'bc660029-a0f8-4e27-9388-6e6cc8011e3f';
DECLARE @R_Company NVARCHAR(450)=N'241f1905-79c6-4aa8-8b59-f4c10ea0e392';

INSERT INTO dbo.AspNetRoles (Id,Name,NormalizedName) VALUES
(@R_Admin,N'Admin',N'ADMIN'),(@R_Student,N'Student',N'STUDENT'),
(@R_Trainer,N'Trainer',N'TRAINER'),(@R_Company,N'Company',N'COMPANY');

INSERT INTO dbo.AspNetUsers (Id,FullName,LegacyUserId,AssignedTrainerUserId,UserName,NormalizedUserName,Email,NormalizedEmail,EmailConfirmed,PasswordHash,SecurityStamp,ConcurrencyStamp,PhoneNumberConfirmed,TwoFactorEnabled,LockoutEnabled,AccessFailedCount) VALUES
(@U_Admin,N'Administrator',N'admin',NULL,N'admin123@gmail.com',N'ADMIN123@GMAIL.COM',N'admin123@gmail.com',N'ADMIN123@GMAIL.COM',1,N'AQAAAAIAAYagAAAAEJNJ9z6sYGCl+IEEbMnKSG6k4IbVk7Ez2uqi+06TovDV7lH6W2p+X8cyRrR3g2rvPw==',N'LM24QXVMCAXN6FFETU5SCPGP3357LZUJ',N'85de3ff8-447e-4a86-90f9-80d7eac2e413',0,0,1,0),
(@U_T2000,N'Trainer User 2000',N'trainer-2000',NULL,N'trainer2000@gmail.com',N'TRAINER2000@GMAIL.COM',N'trainer2000@gmail.com',N'TRAINER2000@GMAIL.COM',1,N'AQAAAAIAAYagAAAAEJVfPOtDEg4+EO/nO4lUmI4psgl9TdOlC3wqMtD+X1lcEngMuBkXWjNaIPLfa4hIng==',N'PYKV7N6CMJMDZVGG5GP56JEDFSHMRHR2',N'a45f8c6a-4125-4d0e-83ff-7799443c1ce5',0,0,1,0),
(@U_T2003,N'Trainer User',N'trainer-2003',NULL,N'trainer2003@gmail.com',N'TRAINER2003@GMAIL.COM',N'trainer2003@gmail.com',N'TRAINER2003@GMAIL.COM',1,N'AQAAAAIAAYagAAAAEHtVqQk292Ac+tE67ZuOH0W597YkYB/UeY+TcHFthRbxv96zVHXIckoHG/CDjyDZLg==',N'VJLXSAJTFODFGJPKPCXBSOEM4R3EJTTI',N'2380f880-e245-4b29-89cd-2c1d512e11b9',0,0,1,0),
(@U_Mohamed,N'Mohamed Ali',N'student-mohamed',@U_T2003,N'mohamed.ali@example.com',N'MOHAMED.ALI@EXAMPLE.COM',N'mohamed.ali@example.com',N'MOHAMED.ALI@EXAMPLE.COM',1,N'AQAAAAIAAYagAAAAEPBUFF/j2glVEj4VdKJ/X8pFEwnfvU5ffbLVNoBfLCmrDkLNJ5IiXufLt2EYik6SnA==',N'BQTMMC7FFNXVZ7W7SXW7MJFPEINEDVCO',N'f9870e25-6d31-485e-937a-76b339449010',0,0,1,0),
(@U_Sara,N'Sara Ahmed',N'student-sara',@U_T2003,N'sara.ahmed@example.com',N'SARA.AHMED@EXAMPLE.COM',N'sara.ahmed@example.com',N'SARA.AHMED@EXAMPLE.COM',1,N'AQAAAAIAAYagAAAAEN6vvaHVaap2cYjJaGiAOoZSJTYqItqizHUeqoqdnnihsPmvyYrnxdo1ddtPfN6iVQ==',N'QFNZFNUQ3PPA4SJDZXWXGCHZWG6F7LDP',N'd1b7aac7-8c0e-463d-986b-d3698accf120',0,0,1,0),
(@U_Hassan,N'Hassan Ibrahim',N'student-hassan',@U_T2003,N'hassan@example.com',N'HASSAN@EXAMPLE.COM',N'hassan@example.com',N'HASSAN@EXAMPLE.COM',1,N'AQAAAAIAAYagAAAAEDFAvlsa8SuJE840L2C4RBt6IsmvblcgWOBVy8JqanlLcwnE0TkA1UjasVbDtaFzyA==',N'ZXL6PQSLMD7HQ6GT6FUDZ7BP2JMRAFPE',N'd1c91dc0-ea34-48d6-853f-91b6ecc24503',0,0,1,0);

INSERT INTO dbo.AspNetUserRoles VALUES
(@U_Admin,@R_Admin),(@U_T2000,@R_Trainer),(@U_T2003,@R_Trainer),
(@U_Mohamed,@R_Student),(@U_Sara,@R_Student),(@U_Hassan,@R_Student);

INSERT INTO dbo.Branches (Id, Name, Region) VALUES
(N'cairo', N'Platform', N''),
(N'alexandria', N'Alexandria', N''),
(N'giza', N'Giza', N'');

INSERT INTO dbo.Tracks (Id,BranchId,Title,Icon,IsActive) VALUES
(N'tr-fe',N'cairo',N'Frontend Development',N'code',1),
(N'tr-be',N'cairo',N'Backend Development',N'db',1),
(N'tr-mo',N'cairo',N'Mobile Development',N'mobile',1),
(N'tr-ds',N'cairo',N'Data & AI',N'db',1),
(N'atr-be',N'alexandria',N'Backend Development',N'db',1),
(N'gtr-ds',N'giza',N'Data & AI',N'db',1);

INSERT INTO dbo.Trainings (Id,BranchId,TrackId,CategoryCode,Title,Body,StartDate,TrainerUserId,SeatsTaken,SeatsTotal,StatusId,FilterTag) VALUES
(N'crt1',N'cairo',N'tr-fe',N'FRONTEND',N'React Fundamentals 2024',N'Learn React from scratch.', '2024-06-01',@U_T2003,15,20,4,N'frontend'),
(N'crt2',N'cairo',N'tr-be',N'BACKEND',N'Node.js Advanced Patterns',N'Deep dive into APIs.', '2024-07-01',@U_T2003,12,18,4,N'backend'),
(N'crt3',N'cairo',N'tr-mo',N'MOBILE',N'Flutter Mobile Development',N'Cross-platform apps.', '2024-08-01',@U_T2003,8,16,5,N'mobile'),
(N'art1',N'alexandria',N'atr-be',N'BACKEND',N'Java Enterprise Lab',N'Spring Boot services.', '2024-09-01',NULL,10,14,4,N'backend'),
(N'grt1',N'giza',N'gtr-ds',N'DATA',N'Python for Analytics',N'Pandas and visualization.', '2024-10-01',NULL,14,20,4,N'backend');

INSERT INTO dbo.TrainingSections (Id,Title,Company,DurationLabel,StatusId,TrainerUserId) VALUES
(N'web-development-bootcamp',N'Web Development Bootcamp',N'TechCorp',N'2024-01-15 - 2024-04-15',7,@U_T2003),
(N'mobile-app-development',N'Mobile App Development',N'AppFactory',N'2024-02-01 - 2024-05-01',7,@U_T2003),
(N'data-science-fundamentals',N'Data Science Fundamentals',N'DataWorks',N'2023-09-01 - 2023-12-01',8,@U_T2003);

INSERT INTO dbo.SectionEnrollments (SectionId, StudentUserId, ProgressPercent, CompletedTasks, TotalTasks) VALUES
(N'web-development-bootcamp', @U_Mohamed, 75, 6, 8),
(N'web-development-bootcamp', @U_Sara,    60, 4, 8),
(N'web-development-bootcamp', @U_Hassan,  45, 3, 8);

INSERT INTO dbo.CompanyPosts (Id,BranchId,Title,StatusId,Body,TrainingTitle,Deadline) VALUES
(N'ap1',N'alexandria',N'Cloud Intern — AWS',13,N'Cloud foundations.',N'Cloud Fundamentals','2024-06-10');

INSERT INTO dbo.CompanyPostTags (PostId,TagId)
SELECT N'ap1', Id FROM dbo.RefTags WHERE Name IN (N'AWS',N'Linux',N'CI/CD');

INSERT INTO dbo.JobApplicants (Id,BranchId,ApplicantUserId,ApplicantInitial,FullName,Email,TrainingTitle,StatusId,AppliedOn) VALUES
(N't1',N'cairo',@U_Hassan,N'H',N'Hassan Ibrahim',N'hassan@example.com',N'Backend Developer Position…',16,'2024-04-12'),
(N't3',N'cairo',@U_Mohamed,N'M',N'Mohamed Ali',N'mohamed.ali@example.com',N'Frontend Developer Internship…',15,'2024-04-14'),
(N't4',N'cairo',@U_Sara,N'S',N'Sara Ahmed',N'sara.ahmed@example.com',N'UI/UX Designer…',15,'2024-04-13');

INSERT INTO dbo.EnrollmentApplications (Id,StudentUserId,BranchId,CourseId,TrainerUserId,MotivationReason,UniversityName,Major,Gpa,StatusId,CreatedAtUtc,UpdatedAtUtc) VALUES
(N'enr-mohamed-crt1',@U_Mohamed,N'cairo',N'crt1',@U_T2003,N'I want to build production-ready React apps.',N'Cairo University',N'Computer Science',N'3.6',2,DATEADD(DAY,-14,SYSUTCDATETIME()),DATEADD(DAY,-10,SYSUTCDATETIME())),
(N'enr-sara-crt2',@U_Sara,N'cairo',N'crt2',@U_T2003,N'Interested in backend architecture.',N'Ain Shams University',N'Software Engineering',N'3.4',1,DATEADD(DAY,-3,SYSUTCDATETIME()),DATEADD(DAY,-3,SYSUTCDATETIME())),
(N'enr-hassan-crt1',@U_Hassan,N'cairo',N'crt1',@U_T2003,N'Career switch into frontend.',N'Helwan University',N'IT',N'3.2',1,DATEADD(DAY,-1,SYSUTCDATETIME()),DATEADD(DAY,-1,SYSUTCDATETIME()));

INSERT INTO dbo.PortalNotifications (Id,UserId,Title,Message,ToneCode,IsRead,CreatedAtUtc,TypeCode,ApplicationId,BranchId,CourseId,TargetView) VALUES
(N'notif-1',@U_T2003,N'New enrollment request',N'Sara Ahmed applied for Node.js Advanced Patterns.',N'info',0,DATEADD(DAY,-3,SYSUTCDATETIME()),N'enrollment_request',N'enr-sara-crt2',N'cairo',N'crt2',N'enrollment-requests'),
(N'notif-2',@U_T2003,N'New enrollment request',N'Hassan Ibrahim applied for React Fundamentals 2024.',N'info',0,DATEADD(DAY,-1,SYSUTCDATETIME()),N'enrollment_request',N'enr-hassan-crt1',N'cairo',N'crt1',N'enrollment-requests');

INSERT INTO dbo.Tasks (Id,StudentUserId,SectionId,Title,Description,DeadlineUtc,StatusId) VALUES
(N'task-ts-101',@U_Mohamed,N'web-development-bootcamp',N'API integration checkpoint',N'Connect dashboard to auth endpoints.',DATEADD(DAY,4,SYSUTCDATETIME()),10),
(N'task-ts-102',@U_Mohamed,N'web-development-bootcamp',N'Weekly learning journal',N'Short reflection on learnings.',DATEADD(DAY,1,SYSUTCDATETIME()),9),
(N'task-ts-103',@U_Mohamed,N'web-development-bootcamp',N'Capstone wireframes',N'Wireframes for reporting module.',DATEADD(DAY,10,SYSUTCDATETIME()),11),
(N'task-ts-201',@U_Sara,N'web-development-bootcamp',N'Security review checklist',N'Secure coding checklist.',DATEADD(DAY,3,SYSUTCDATETIME()),9),
(N'task-ts-202',@U_Sara,N'web-development-bootcamp',N'Unit tests for validators',N'Edge case tests.',DATEADD(DAY,6,SYSUTCDATETIME()),10),
(N'task-ts-301',@U_Hassan,N'web-development-bootcamp',N'Onboarding quiz',N'Platform onboarding check.',DATEADD(DAY,-1,SYSUTCDATETIME()),12);

INSERT INTO dbo.TaskSubmissions (Id,StudentUserId,TaskId,SubmissionLink,FileName,Notes,SubmittedAtUtc) VALUES
(N'sub-demo-1',@U_Mohamed,N'task-ts-101',N'https://example.com/mohamed/api-checkpoint',N'api-notes.pdf',N'Initial submission.',DATEADD(DAY,-1,SYSUTCDATETIME()));
UPDATE dbo.Tasks SET LastSubmissionId=N'sub-demo-1' WHERE Id=N'task-ts-101';

INSERT INTO dbo.Messages (Id,SenderUserId,ReceiverUserId,SenderRole,ReceiverRole,Content,TaskId,TimestampUtc) VALUES
(N'msg-001',@U_T2003,@U_Mohamed,N'Trainer',N'Student',N'Please submit the API integration task by Friday.',N'task-ts-101',DATEADD(HOUR,-6,SYSUTCDATETIME())),
(N'msg-002',@U_Mohamed,@U_T2003,N'Student',N'Trainer',N'Understood. I will submit before deadline.',NULL,DATEADD(HOUR,-5,SYSUTCDATETIME()));

INSERT INTO dbo.TrainerFeedback (Id,StudentUserId,TrainerUserId,TaskId,Comment,Grade,AtUtc) VALUES
(N'fb-1',@U_Mohamed,@U_T2003,N'task-ts-101',N'Nice error handling on auth failures.',N'A-',DATEADD(DAY,-1,SYSUTCDATETIME())),
(N'fb-0',@U_Mohamed,@U_T2003,N'task-ts-103',N'Flows are clear; add empty states.',N'B+',DATEADD(DAY,-6,SYSUTCDATETIME())),
(N'fb-3',@U_Sara,NULL,NULL,N'Great momentum this week.',N'B',DATEADD(DAY,-2,SYSUTCDATETIME()));

INSERT INTO dbo.TraineeEvaluations (Id,StudentUserId,DisplayName) VALUES
(N'mohamed-ali',@U_Mohamed,N'Mohamed Ali'),
(N'hassan-ibrahim',@U_Hassan,N'Hassan Ibrahim'),
(N'fatma-zahra',NULL,N'Fatma Zahra');

INSERT INTO dbo.EvaluationTaskItems (Id,EvaluationId,Title,Deadline,SubmittedOn,RepoTag,RepoBranch,StatusId) VALUES
(N'ev-m1',N'mohamed-ali',N'Create Landing Page','2024-02-15','2024-02-14',N'landing-page-project',N'main',20),
(N'ev-m2',N'mohamed-ali',N'Build Authentication','2024-03-01','2024-02-28',N'landing-page-project',N'main',21),
(N'ev-m3',N'mohamed-ali',N'Dashboard Layout','2024-03-15',NULL,N'landing-page-project',N'main',22),
(N'ev-h1',N'hassan-ibrahim',N'Create Landing Page','2024-02-16','2024-02-15',N'landing-page-project',N'main',21),
(N'ev-f1',N'fatma-zahra',N'Sub Active Directory','2024-02-20','2024-02-19',N'ad-lab',N'main',21);

INSERT INTO dbo.InternshipPrograms (Id,Title,Company,Specialization,TrainingType,Summary,OpensOnUtc,ClosesOnUtc) VALUES
(N'prog-cloud-01',N'Cloud reliability intern',N'Northwind Labs',N'Cloud / DevOps',N'Internship',N'On-call rotations.',DATEADD(MONTH,-1,SYSUTCDATETIME()),DATEADD(MONTH,2,SYSUTCDATETIME())),
(N'prog-sec-02',N'Application security residency',N'Contoso Security',N'Cybersecurity',N'Residency',N'Threat modeling.',DATEADD(DAY,-14,SYSUTCDATETIME()),DATEADD(DAY,30,SYSUTCDATETIME())),
(N'prog-fe-03',N'Product engineering trainee',N'Fabrikam Digital',N'Frontend',N'Traineeship',N'UI experiments.',DATEADD(DAY,-7,SYSUTCDATETIME()),DATEADD(DAY,45,SYSUTCDATETIME()));

INSERT INTO dbo.InternshipApplications (Id,StudentUserId,ProgramId,StatusId,CoverLetter,CvFileName,CreatedAtUtc) VALUES
(N'app-demo-1',@U_Mohamed,N'prog-cloud-01',19,N'Excited about reliability work.',N'Mohamed_Ali_CV.pdf',DATEADD(DAY,-5,SYSUTCDATETIME()));

INSERT INTO dbo.InternshipApplicationTimelineSteps (ApplicationId,StepOrder,Label,State,AtUtc) VALUES
(N'app-demo-1',1,N'Application received',N'Complete',DATEADD(DAY,-5,SYSUTCDATETIME())),
(N'app-demo-1',2,N'Recruiter screen',N'In progress',DATEADD(DAY,-3,SYSUTCDATETIME())),
(N'app-demo-1',3,N'Technical interview',N'Upcoming',DATEADD(DAY,2,SYSUTCDATETIME()));

INSERT INTO dbo.__EFMigrationsHistory VALUES (N'20260607072845_InitialIdentityAuth',N'8.0.8');
GO

/* Verification */
SELECT * FROM dbo.vw_TrackStats ORDER BY TrackId;
SELECT COUNT(*) AS OrphanCount FROM dbo.Tasks t
    LEFT JOIN dbo.AspNetUsers u ON u.Id=t.StudentUserId WHERE u.Id IS NULL;
PRINT N'IT Connect Schema v3 deployed successfully.';
GO
