/* =============================================================================
   IT Connect — Enterprise SQL Server Schema (Normalized + Full FK Integrity)
   Version : 2.0 (superseded by ITConnect_SQLServer_FullSetup_v3.sql)
   Run in  : SQL Server Management Studio / Azure Data Studio

   DESIGN NOTES (see end of file for simplification suggestions)
   - User references use AspNetUsers.Id as primary FK (StudentUserId, etc.)
   - LegacyUserId columns retained for API backward compatibility (denormalized)
   - ON DELETE CASCADE  : child/detail rows (timeline steps, submissions, tokens)
   - ON DELETE NO ACTION: business entities (users, trainings, enrollments)
   - ON DELETE SET NULL : optional links (TrackId, SectionId, TaskId, trainers)

   Connection string:
   Server=localhost;Database=ITConnectDb;Trusted_Connection=True;TrustServerCertificate=True;
   ============================================================================= */

USE master;
GO

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'ITConnectDb')
    CREATE DATABASE ITConnectDb;
GO

USE ITConnectDb;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ═══════════════════════════════════════════════════════════════════════════
   DROP — strict dependency order (children → parents)
   ═══════════════════════════════════════════════════════════════════════════ */
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
   IDENTITY & SECURITY
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.AspNetRoles (
    Id               NVARCHAR(450)  NOT NULL,
    Name             NVARCHAR(256)  NULL,
    NormalizedName   NVARCHAR(256)  NULL,
    ConcurrencyStamp NVARCHAR(MAX)  NULL,
    CONSTRAINT PK_AspNetRoles PRIMARY KEY CLUSTERED (Id)
);
GO
CREATE UNIQUE NONCLUSTERED INDEX UX_AspNetRoles_NormalizedName
    ON dbo.AspNetRoles (NormalizedName) WHERE NormalizedName IS NOT NULL;
GO

CREATE TABLE dbo.AspNetUsers (
    Id                    NVARCHAR(450)  NOT NULL,
    FullName              NVARCHAR(120)  NOT NULL,
    LegacyUserId          NVARCHAR(64)   NOT NULL,
    AssignedTrainerUserId NVARCHAR(450)  NULL,
    TrainerLegacyId       NVARCHAR(64)   NULL,
    CreatedAtUtc          DATETIME2      NOT NULL,
    UserName              NVARCHAR(256)  NULL,
    NormalizedUserName    NVARCHAR(256)  NULL,
    Email                 NVARCHAR(256)  NULL,
    NormalizedEmail       NVARCHAR(256)  NULL,
    EmailConfirmed        BIT            NOT NULL CONSTRAINT DF_AspNetUsers_EmailConfirmed DEFAULT (0),
    PasswordHash          NVARCHAR(MAX)  NULL,
    SecurityStamp         NVARCHAR(MAX)  NULL,
    ConcurrencyStamp      NVARCHAR(MAX)  NULL,
    PhoneNumber           NVARCHAR(MAX)  NULL,
    PhoneNumberConfirmed  BIT            NOT NULL CONSTRAINT DF_AspNetUsers_PhoneConfirmed DEFAULT (0),
    TwoFactorEnabled      BIT            NOT NULL CONSTRAINT DF_AspNetUsers_2FA DEFAULT (0),
    LockoutEnd            DATETIMEOFFSET NULL,
    LockoutEnabled        BIT            NOT NULL CONSTRAINT DF_AspNetUsers_Lockout DEFAULT (0),
    AccessFailedCount     INT            NOT NULL CONSTRAINT DF_AspNetUsers_Failed DEFAULT (0),
    CONSTRAINT PK_AspNetUsers PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_AspNetUsers_AssignedTrainer
        FOREIGN KEY (AssignedTrainerUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE NO ACTION
);
GO
CREATE UNIQUE NONCLUSTERED INDEX UX_AspNetUsers_NormalizedUserName
    ON dbo.AspNetUsers (NormalizedUserName) WHERE NormalizedUserName IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_AspNetUsers_NormalizedEmail ON dbo.AspNetUsers (NormalizedEmail);
CREATE UNIQUE NONCLUSTERED INDEX UX_AspNetUsers_LegacyUserId ON dbo.AspNetUsers (LegacyUserId);
CREATE NONCLUSTERED INDEX IX_AspNetUsers_AssignedTrainerUserId ON dbo.AspNetUsers (AssignedTrainerUserId);
GO

CREATE TABLE dbo.AspNetRoleClaims (
    Id         INT IDENTITY(1,1) NOT NULL,
    RoleId     NVARCHAR(450)     NOT NULL,
    ClaimType  NVARCHAR(MAX)     NULL,
    ClaimValue NVARCHAR(MAX)     NULL,
    CONSTRAINT PK_AspNetRoleClaims PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_AspNetRoleClaims_RoleId
        FOREIGN KEY (RoleId) REFERENCES dbo.AspNetRoles (Id) ON DELETE CASCADE
);
CREATE NONCLUSTERED INDEX IX_AspNetRoleClaims_RoleId ON dbo.AspNetRoleClaims (RoleId);
GO

CREATE TABLE dbo.AspNetUserClaims (
    Id         INT IDENTITY(1,1) NOT NULL,
    UserId     NVARCHAR(450)     NOT NULL,
    ClaimType  NVARCHAR(MAX)     NULL,
    ClaimValue NVARCHAR(MAX)     NULL,
    CONSTRAINT PK_AspNetUserClaims PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_AspNetUserClaims_UserId
        FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE CASCADE
);
CREATE NONCLUSTERED INDEX IX_AspNetUserClaims_UserId ON dbo.AspNetUserClaims (UserId);
GO

CREATE TABLE dbo.AspNetUserLogins (
    LoginProvider       NVARCHAR(128) NOT NULL,
    ProviderKey         NVARCHAR(128) NOT NULL,
    ProviderDisplayName NVARCHAR(MAX) NULL,
    UserId              NVARCHAR(450) NOT NULL,
    CONSTRAINT PK_AspNetUserLogins PRIMARY KEY CLUSTERED (LoginProvider, ProviderKey),
    CONSTRAINT FK_AspNetUserLogins_UserId
        FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE CASCADE
);
CREATE NONCLUSTERED INDEX IX_AspNetUserLogins_UserId ON dbo.AspNetUserLogins (UserId);
GO

CREATE TABLE dbo.AspNetUserRoles (
    UserId NVARCHAR(450) NOT NULL,
    RoleId NVARCHAR(450) NOT NULL,
    CONSTRAINT PK_AspNetUserRoles PRIMARY KEY CLUSTERED (UserId, RoleId),
    CONSTRAINT FK_AspNetUserRoles_RoleId
        FOREIGN KEY (RoleId) REFERENCES dbo.AspNetRoles (Id) ON DELETE CASCADE,
    CONSTRAINT FK_AspNetUserRoles_UserId
        FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE CASCADE
);
CREATE NONCLUSTERED INDEX IX_AspNetUserRoles_RoleId ON dbo.AspNetUserRoles (RoleId);
GO

CREATE TABLE dbo.AspNetUserTokens (
    UserId        NVARCHAR(450) NOT NULL,
    LoginProvider NVARCHAR(128) NOT NULL,
    Name          NVARCHAR(128) NOT NULL,
    Value         NVARCHAR(MAX) NULL,
    CONSTRAINT PK_AspNetUserTokens PRIMARY KEY CLUSTERED (UserId, LoginProvider, Name),
    CONSTRAINT FK_AspNetUserTokens_UserId
        FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.AuditLogs (
    Id           UNIQUEIDENTIFIER NOT NULL,
    EventType    INT              NOT NULL,
    UserId       NVARCHAR(450)    NULL,
    Email        NVARCHAR(256)    NULL,
    IpAddress    NVARCHAR(64)     NULL,
    UserAgent    NVARCHAR(512)    NULL,
    Details      NVARCHAR(2000)   NULL,
    Success      BIT              NOT NULL,
    CreatedAtUtc DATETIME2        NOT NULL,
    CONSTRAINT PK_AuditLogs PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_AuditLogs_UserId
        FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE SET NULL
);
CREATE NONCLUSTERED INDEX IX_AuditLogs_UserId ON dbo.AuditLogs (UserId);
CREATE NONCLUSTERED INDEX IX_AuditLogs_CreatedAtUtc ON dbo.AuditLogs (CreatedAtUtc);
CREATE NONCLUSTERED INDEX IX_AuditLogs_EventType ON dbo.AuditLogs (EventType);
GO

CREATE TABLE dbo.RefreshTokens (
    Id                  UNIQUEIDENTIFIER NOT NULL,
    UserId              NVARCHAR(450)    NOT NULL,
    TokenHash           NVARCHAR(128)    NOT NULL,
    CreatedAtUtc        DATETIME2        NOT NULL,
    ExpiresAtUtc        DATETIME2        NOT NULL,
    RevokedAtUtc        DATETIME2        NULL,
    ReplacedByTokenHash NVARCHAR(MAX)    NULL,
    CreatedByIp         NVARCHAR(MAX)    NULL,
    CONSTRAINT PK_RefreshTokens PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_RefreshTokens_UserId
        FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE CASCADE
);
CREATE UNIQUE NONCLUSTERED INDEX UX_RefreshTokens_TokenHash ON dbo.RefreshTokens (TokenHash);
CREATE NONCLUSTERED INDEX IX_RefreshTokens_UserId ON dbo.RefreshTokens (UserId);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   CATALOG — Branches → Tracks → Trainings
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.Branches (
    Id     NVARCHAR(64)  NOT NULL,
    Name   NVARCHAR(120) NOT NULL,
    Region NVARCHAR(120) NULL,
    CONSTRAINT PK_Branches PRIMARY KEY CLUSTERED (Id)
);
GO

CREATE TABLE dbo.Tracks (
    Id             NVARCHAR(64)  NOT NULL,
    BranchId       NVARCHAR(64)  NOT NULL,
    Title          NVARCHAR(200) NOT NULL,
    Icon           NVARCHAR(32)  NULL,
    TrainingsCount INT           NOT NULL CONSTRAINT DF_Tracks_TrainingsCount DEFAULT (0),
    StudentsCount  INT           NOT NULL CONSTRAINT DF_Tracks_StudentsCount DEFAULT (0),
    IsActive       BIT           NOT NULL CONSTRAINT DF_Tracks_IsActive DEFAULT (1),
    CONSTRAINT PK_Tracks PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_Tracks_BranchId
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches (Id) ON DELETE CASCADE
);
CREATE NONCLUSTERED INDEX IX_Tracks_BranchId ON dbo.Tracks (BranchId);
GO

CREATE TABLE dbo.Trainings (
    Id               NVARCHAR(64)   NOT NULL,
    BranchId         NVARCHAR(64)   NOT NULL,
    TrackId          NVARCHAR(64)   NULL,
    Category         NVARCHAR(32)   NOT NULL,
    Title            NVARCHAR(300)  NOT NULL,
    Body             NVARCHAR(MAX)  NULL,
    StartDate        DATE           NULL,
    Location         NVARCHAR(200)  NULL,
    TrainerUserId    NVARCHAR(450)  NULL,
    TrainerLegacyId  NVARCHAR(64)   NULL,
    TrainerEmail     NVARCHAR(256)  NULL,
    TrainerName      NVARCHAR(120)  NULL,
    TrainerInitials  NVARCHAR(8)    NULL,
    SeatsTaken       INT            NOT NULL CONSTRAINT DF_Trainings_SeatsTaken DEFAULT (0),
    SeatsTotal       INT            NOT NULL CONSTRAINT DF_Trainings_SeatsTotal DEFAULT (0),
    Status           NVARCHAR(32)   NOT NULL,
    FilterTag        NVARCHAR(32)   NULL,
    CONSTRAINT PK_Trainings PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_Trainings_BranchId
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Trainings_TrackId
        FOREIGN KEY (TrackId) REFERENCES dbo.Tracks (Id) ON DELETE SET NULL,
    CONSTRAINT FK_Trainings_TrainerUserId
        FOREIGN KEY (TrainerUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE SET NULL
);
CREATE NONCLUSTERED INDEX IX_Trainings_BranchId ON dbo.Trainings (BranchId);
CREATE NONCLUSTERED INDEX IX_Trainings_TrackId ON dbo.Trainings (TrackId);
CREATE NONCLUSTERED INDEX IX_Trainings_TrainerUserId ON dbo.Trainings (TrainerUserId);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   TRAINER WORKSPACE — Sections & enrollments
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.TrainingSections (
    Id              NVARCHAR(128) NOT NULL,
    Title           NVARCHAR(300) NOT NULL,
    Company         NVARCHAR(120) NULL,
    DurationLabel   NVARCHAR(64)  NULL,
    Status          NVARCHAR(32)  NOT NULL,
    TasksCount      INT           NOT NULL CONSTRAINT DF_TrainingSections_TasksCount DEFAULT (0),
    TrainerUserId   NVARCHAR(450) NOT NULL,
    TrainerLegacyId NVARCHAR(64)  NOT NULL,
    CONSTRAINT PK_TrainingSections PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_TrainingSections_TrainerUserId
        FOREIGN KEY (TrainerUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE NO ACTION
);
CREATE NONCLUSTERED INDEX IX_TrainingSections_TrainerUserId ON dbo.TrainingSections (TrainerUserId);
GO

CREATE TABLE dbo.SectionEnrollments (
    SectionId         NVARCHAR(128) NOT NULL,
    StudentUserId     NVARCHAR(450) NOT NULL,
    StudentLegacyId   NVARCHAR(64)  NOT NULL,
    ProgressPercent   INT           NOT NULL CONSTRAINT DF_SectionEnrollments_Progress DEFAULT (0),
    CompletedTasks    INT           NOT NULL CONSTRAINT DF_SectionEnrollments_Completed DEFAULT (0),
    TotalTasks        INT           NOT NULL CONSTRAINT DF_SectionEnrollments_Total DEFAULT (0),
    CONSTRAINT PK_SectionEnrollments PRIMARY KEY CLUSTERED (SectionId, StudentUserId),
    CONSTRAINT FK_SectionEnrollments_SectionId
        FOREIGN KEY (SectionId) REFERENCES dbo.TrainingSections (Id) ON DELETE CASCADE,
    CONSTRAINT FK_SectionEnrollments_StudentUserId
        FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE NO ACTION
);
CREATE NONCLUSTERED INDEX IX_SectionEnrollments_StudentUserId ON dbo.SectionEnrollments (StudentUserId);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN — Company posts & external job applicants
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.CompanyPosts (
    Id              NVARCHAR(64)  NOT NULL,
    BranchId        NVARCHAR(64)  NOT NULL,
    Title           NVARCHAR(300) NOT NULL,
    Status          NVARCHAR(32)  NOT NULL,
    Body            NVARCHAR(MAX) NULL,
    TrainingTitle   NVARCHAR(300) NULL,
    Deadline        DATE          NULL,
    ApplicantsCount INT           NOT NULL CONSTRAINT DF_CompanyPosts_Applicants DEFAULT (0),
    Tags            NVARCHAR(500) NULL,
    CONSTRAINT PK_CompanyPosts PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_CompanyPosts_BranchId
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches (Id) ON DELETE NO ACTION
);
CREATE NONCLUSTERED INDEX IX_CompanyPosts_BranchId ON dbo.CompanyPosts (BranchId);
GO

CREATE TABLE dbo.JobApplicants (
    Id               NVARCHAR(64)  NOT NULL,
    BranchId         NVARCHAR(64)  NOT NULL,
    ApplicantInitial NVARCHAR(4)   NULL,
    FullName         NVARCHAR(120) NOT NULL,
    Email            NVARCHAR(256) NOT NULL,
    TrainingTitle    NVARCHAR(300) NULL,
    Status           NVARCHAR(32)  NOT NULL,
    AppliedOn        DATE          NULL,
    CONSTRAINT PK_JobApplicants PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_JobApplicants_BranchId
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches (Id) ON DELETE NO ACTION
);
CREATE NONCLUSTERED INDEX IX_JobApplicants_BranchId ON dbo.JobApplicants (BranchId);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   ENROLLMENTS — Student course access requests
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.EnrollmentApplications (
    Id                NVARCHAR(64)  NOT NULL,
    StudentUserId     NVARCHAR(450) NOT NULL,
    UserLegacyId      NVARCHAR(64)  NOT NULL,
    UserEmail         NVARCHAR(256) NOT NULL,
    UserName          NVARCHAR(120) NOT NULL,
    BranchId          NVARCHAR(64)  NOT NULL,
    CourseId          NVARCHAR(64)  NOT NULL,
    CourseTitle       NVARCHAR(300) NOT NULL,
    TrainerUserId     NVARCHAR(450) NOT NULL,
    TrainerLegacyId   NVARCHAR(64)  NOT NULL,
    TrainerEmail      NVARCHAR(256) NULL,
    TrainerName       NVARCHAR(120) NULL,
    MotivationReason  NVARCHAR(MAX) NULL,
    UniversityName    NVARCHAR(200) NULL,
    Major             NVARCHAR(120) NULL,
    Gpa               NVARCHAR(16)  NULL,
    PreviousStudies   NVARCHAR(MAX) NULL,
    CvFileName        NVARCHAR(260) NULL,
    CvFileUrl         NVARCHAR(500) NULL,
    Status            NVARCHAR(32)  NOT NULL,
    RejectionReason   NVARCHAR(MAX) NULL,
    ReviewedAtUtc     DATETIME2     NULL,
    ReviewedByUserId  NVARCHAR(450) NULL,
    CreatedAtUtc      DATETIME2     NOT NULL,
    UpdatedAtUtc      DATETIME2     NOT NULL,
    CONSTRAINT PK_EnrollmentApplications PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_EnrollmentApplications_StudentUserId
        FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_EnrollmentApplications_BranchId
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_EnrollmentApplications_CourseId
        FOREIGN KEY (CourseId) REFERENCES dbo.Trainings (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_EnrollmentApplications_TrainerUserId
        FOREIGN KEY (TrainerUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_EnrollmentApplications_ReviewedByUserId
        FOREIGN KEY (ReviewedByUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE SET NULL
);
CREATE NONCLUSTERED INDEX IX_EnrollmentApplications_StudentUserId ON dbo.EnrollmentApplications (StudentUserId);
CREATE NONCLUSTERED INDEX IX_EnrollmentApplications_BranchId ON dbo.EnrollmentApplications (BranchId);
CREATE NONCLUSTERED INDEX IX_EnrollmentApplications_CourseId ON dbo.EnrollmentApplications (CourseId);
CREATE NONCLUSTERED INDEX IX_EnrollmentApplications_TrainerUserId ON dbo.EnrollmentApplications (TrainerUserId);
CREATE NONCLUSTERED INDEX IX_EnrollmentApplications_Status ON dbo.EnrollmentApplications (Status);
GO

CREATE TABLE dbo.PortalNotifications (
    Id             NVARCHAR(64)  NOT NULL,
    UserId         NVARCHAR(450) NOT NULL,
    UserLegacyId   NVARCHAR(64)  NOT NULL,
    Title          NVARCHAR(200) NOT NULL,
    Message        NVARCHAR(MAX) NOT NULL,
    Tone           NVARCHAR(32)  NOT NULL,
    IsRead         BIT           NOT NULL CONSTRAINT DF_PortalNotifications_IsRead DEFAULT (0),
    CreatedAtUtc   DATETIME2     NOT NULL,
    Type           NVARCHAR(64)  NOT NULL,
    ApplicationId  NVARCHAR(64)  NULL,
    BranchId       NVARCHAR(64)  NULL,
    CourseId       NVARCHAR(64)  NULL,
    CourseTitle    NVARCHAR(300) NULL,
    TargetView     NVARCHAR(64)  NOT NULL,
    CONSTRAINT PK_PortalNotifications PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_PortalNotifications_UserId
        FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE CASCADE,
    CONSTRAINT FK_PortalNotifications_ApplicationId
        FOREIGN KEY (ApplicationId) REFERENCES dbo.EnrollmentApplications (Id) ON DELETE SET NULL,
    CONSTRAINT FK_PortalNotifications_BranchId
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches (Id) ON DELETE SET NULL,
    CONSTRAINT FK_PortalNotifications_CourseId
        FOREIGN KEY (CourseId) REFERENCES dbo.Trainings (Id) ON DELETE SET NULL
);
CREATE NONCLUSTERED INDEX IX_PortalNotifications_UserId ON dbo.PortalNotifications (UserId);
CREATE NONCLUSTERED INDEX IX_PortalNotifications_ApplicationId ON dbo.PortalNotifications (ApplicationId);
CREATE NONCLUSTERED INDEX IX_PortalNotifications_BranchId ON dbo.PortalNotifications (BranchId);
CREATE NONCLUSTERED INDEX IX_PortalNotifications_CourseId ON dbo.PortalNotifications (CourseId);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   TASKS & SUBMISSIONS
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.Tasks (
    Id                NVARCHAR(64)  NOT NULL,
    StudentUserId     NVARCHAR(450) NOT NULL,
    StudentLegacyId   NVARCHAR(64)  NOT NULL,
    SectionId         NVARCHAR(128) NULL,
    Title             NVARCHAR(300) NOT NULL,
    Description       NVARCHAR(MAX) NULL,
    DeadlineUtc       DATETIME2     NOT NULL,
    SubmissionStatus  NVARCHAR(64)  NOT NULL,
    LastSubmissionId  NVARCHAR(64)  NULL,
    CONSTRAINT PK_Tasks PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_Tasks_StudentUserId
        FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Tasks_SectionId
        FOREIGN KEY (SectionId) REFERENCES dbo.TrainingSections (Id) ON DELETE SET NULL
);
CREATE NONCLUSTERED INDEX IX_Tasks_StudentUserId ON dbo.Tasks (StudentUserId);
CREATE NONCLUSTERED INDEX IX_Tasks_SectionId ON dbo.Tasks (SectionId);
GO

CREATE TABLE dbo.TaskSubmissions (
    Id              NVARCHAR(64)  NOT NULL,
    StudentUserId   NVARCHAR(450) NOT NULL,
    StudentLegacyId NVARCHAR(64)  NOT NULL,
    TaskId          NVARCHAR(64)  NOT NULL,
    SubmissionLink  NVARCHAR(500) NULL,
    FileName        NVARCHAR(260) NULL,
    Notes           NVARCHAR(MAX) NULL,
    SubmittedAtUtc  DATETIME2     NOT NULL,
    CONSTRAINT PK_TaskSubmissions PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_TaskSubmissions_StudentUserId
        FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_TaskSubmissions_TaskId
        FOREIGN KEY (TaskId) REFERENCES dbo.Tasks (Id) ON DELETE CASCADE
);
CREATE NONCLUSTERED INDEX IX_TaskSubmissions_StudentUserId ON dbo.TaskSubmissions (StudentUserId);
CREATE NONCLUSTERED INDEX IX_TaskSubmissions_TaskId ON dbo.TaskSubmissions (TaskId);
GO

/* Deferred FK: Tasks.LastSubmissionId → TaskSubmissions (avoids insert cycle) */
ALTER TABLE dbo.Tasks ADD CONSTRAINT FK_Tasks_LastSubmissionId
    FOREIGN KEY (LastSubmissionId) REFERENCES dbo.TaskSubmissions (Id) ON DELETE SET NULL;
GO

/* ═══════════════════════════════════════════════════════════════════════════
   MESSAGING, FEEDBACK, EVALUATIONS
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.Messages (
    Id                NVARCHAR(64)  NOT NULL,
    SenderUserId      NVARCHAR(450) NOT NULL,
    SenderLegacyId    NVARCHAR(64)  NOT NULL,
    ReceiverUserId    NVARCHAR(450) NOT NULL,
    ReceiverLegacyId  NVARCHAR(64)  NOT NULL,
    SenderRole        NVARCHAR(32)  NOT NULL,
    ReceiverRole      NVARCHAR(32)  NOT NULL,
    Content           NVARCHAR(MAX) NOT NULL,
    TaskId            NVARCHAR(64)  NULL,
    TimestampUtc      DATETIME2     NOT NULL,
    CONSTRAINT PK_Messages PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_Messages_SenderUserId
        FOREIGN KEY (SenderUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Messages_ReceiverUserId
        FOREIGN KEY (ReceiverUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Messages_TaskId
        FOREIGN KEY (TaskId) REFERENCES dbo.Tasks (Id) ON DELETE SET NULL
);
CREATE NONCLUSTERED INDEX IX_Messages_SenderUserId ON dbo.Messages (SenderUserId);
CREATE NONCLUSTERED INDEX IX_Messages_ReceiverUserId ON dbo.Messages (ReceiverUserId);
CREATE NONCLUSTERED INDEX IX_Messages_TaskId ON dbo.Messages (TaskId);
GO

CREATE TABLE dbo.TrainerFeedback (
    Id              NVARCHAR(64)  NOT NULL,
    StudentUserId   NVARCHAR(450) NOT NULL,
    StudentLegacyId NVARCHAR(64)  NOT NULL,
    TrainerUserId   NVARCHAR(450) NULL,
    TaskTitle       NVARCHAR(300) NOT NULL,
    TrainerName     NVARCHAR(120) NOT NULL,
    Comment         NVARCHAR(MAX) NOT NULL,
    Grade           NVARCHAR(16)  NULL,
    AtUtc           DATETIME2     NOT NULL,
    CONSTRAINT PK_TrainerFeedback PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_TrainerFeedback_StudentUserId
        FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_TrainerFeedback_TrainerUserId
        FOREIGN KEY (TrainerUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE SET NULL
);
CREATE NONCLUSTERED INDEX IX_TrainerFeedback_StudentUserId ON dbo.TrainerFeedback (StudentUserId);
CREATE NONCLUSTERED INDEX IX_TrainerFeedback_TrainerUserId ON dbo.TrainerFeedback (TrainerUserId);
GO

CREATE TABLE dbo.TraineeEvaluations (
    Id              NVARCHAR(64)  NOT NULL,
    StudentUserId   NVARCHAR(450) NULL,
    StudentLegacyId NVARCHAR(64)  NULL,
    TraineeName     NVARCHAR(120) NOT NULL,
    PendingCount    INT           NOT NULL CONSTRAINT DF_TraineeEvaluations_Pending DEFAULT (0),
    CONSTRAINT PK_TraineeEvaluations PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_TraineeEvaluations_StudentUserId
        FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE SET NULL
);
CREATE NONCLUSTERED INDEX IX_TraineeEvaluations_StudentUserId ON dbo.TraineeEvaluations (StudentUserId);
GO

CREATE TABLE dbo.EvaluationTaskItems (
    Id           NVARCHAR(64) NOT NULL,
    EvaluationId NVARCHAR(64) NOT NULL,
    Title        NVARCHAR(300) NOT NULL,
    Deadline     DATE         NULL,
    SubmittedOn  DATE         NULL,
    RepoTag      NVARCHAR(120) NULL,
    RepoBranch   NVARCHAR(64) NULL,
    Status       NVARCHAR(64) NOT NULL,
    CONSTRAINT PK_EvaluationTaskItems PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_EvaluationTaskItems_EvaluationId
        FOREIGN KEY (EvaluationId) REFERENCES dbo.TraineeEvaluations (Id) ON DELETE CASCADE
);
CREATE NONCLUSTERED INDEX IX_EvaluationTaskItems_EvaluationId ON dbo.EvaluationTaskItems (EvaluationId);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   INTERNSHIPS
   ═══════════════════════════════════════════════════════════════════════════ */
CREATE TABLE dbo.InternshipPrograms (
    Id              NVARCHAR(64)  NOT NULL,
    Title           NVARCHAR(300) NOT NULL,
    Company         NVARCHAR(120) NOT NULL,
    Specialization  NVARCHAR(120) NOT NULL,
    TrainingType    NVARCHAR(64)  NOT NULL,
    Summary         NVARCHAR(MAX) NULL,
    OpensOnUtc      DATETIME2     NOT NULL,
    ClosesOnUtc     DATETIME2     NOT NULL,
    CONSTRAINT PK_InternshipPrograms PRIMARY KEY CLUSTERED (Id)
);
GO

CREATE TABLE dbo.InternshipApplications (
    Id              NVARCHAR(64)  NOT NULL,
    StudentUserId   NVARCHAR(450) NOT NULL,
    StudentLegacyId NVARCHAR(64)  NOT NULL,
    ProgramId       NVARCHAR(64)  NOT NULL,
    Status          NVARCHAR(32)  NOT NULL,
    CoverLetter     NVARCHAR(MAX) NULL,
    CvFileName      NVARCHAR(260) NULL,
    CreatedAtUtc    DATETIME2     NOT NULL,
    CONSTRAINT PK_InternshipApplications PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_InternshipApplications_StudentUserId
        FOREIGN KEY (StudentUserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_InternshipApplications_ProgramId
        FOREIGN KEY (ProgramId) REFERENCES dbo.InternshipPrograms (Id) ON DELETE NO ACTION
);
CREATE NONCLUSTERED INDEX IX_InternshipApplications_StudentUserId ON dbo.InternshipApplications (StudentUserId);
CREATE NONCLUSTERED INDEX IX_InternshipApplications_ProgramId ON dbo.InternshipApplications (ProgramId);
GO

CREATE TABLE dbo.InternshipApplicationTimelineSteps (
    Id            UNIQUEIDENTIFIER NOT NULL,
    ApplicationId NVARCHAR(64)     NOT NULL,
    StepOrder     INT              NOT NULL,
    Label         NVARCHAR(200)    NOT NULL,
    State         NVARCHAR(64)     NOT NULL,
    AtUtc         DATETIME2        NOT NULL,
    CONSTRAINT PK_InternshipApplicationTimelineSteps PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_InternshipTimeline_ApplicationId
        FOREIGN KEY (ApplicationId) REFERENCES dbo.InternshipApplications (Id) ON DELETE CASCADE
);
CREATE NONCLUSTERED INDEX IX_InternshipTimeline_ApplicationId ON dbo.InternshipApplicationTimelineSteps (ApplicationId);
GO

CREATE TABLE dbo.__EFMigrationsHistory (
    MigrationId    NVARCHAR(150) NOT NULL,
    ProductVersion NVARCHAR(32)  NOT NULL,
    CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY CLUSTERED (MigrationId)
);
GO

/* ═══════════════════════════════════════════════════════════════════════════
   SEED DATA — canonical user IDs (stable across environments)
   ═══════════════════════════════════════════════════════════════════════════ */
DECLARE @User_Admin         NVARCHAR(450) = N'94d3ac02-9d0b-499f-8247-9a0c1e2d7c10';
DECLARE @User_Trainer2000   NVARCHAR(450) = N'2b39681f-a083-4975-ab81-be88ffc750c7';
DECLARE @User_Trainer2003   NVARCHAR(450) = N'1025fadc-970e-461c-a3ae-a1203f4ad711';
DECLARE @User_Mohamed       NVARCHAR(450) = N'f22f369d-74cc-4598-b0a9-97497a0e69f7';
DECLARE @User_Sara          NVARCHAR(450) = N'9c6a3950-56f4-47ca-8a78-e8aa90b4ea32';
DECLARE @User_Hassan        NVARCHAR(450) = N'e59cf774-cebd-448a-acc0-20f5724288b4';

DECLARE @Role_Admin   NVARCHAR(450) = N'd277b99b-f0e3-4f8d-a712-3afeeabb7ec4';
DECLARE @Role_Student NVARCHAR(450) = N'ca1e6f1d-51de-4792-aced-489c2545c6c9';
DECLARE @Role_Trainer NVARCHAR(450) = N'bc660029-a0f8-4e27-9388-6e6cc8011e3f';
DECLARE @Role_Company NVARCHAR(450) = N'241f1905-79c6-4aa8-8b59-f4c10ea0e392';

/* ── Roles ── */
INSERT INTO dbo.AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp) VALUES
(@Role_Admin,   N'Admin',   N'ADMIN',   NULL),
(@Role_Student, N'Student', N'STUDENT', NULL),
(@Role_Trainer, N'Trainer', N'TRAINER', NULL),
(@Role_Company, N'Company', N'COMPANY', NULL);

/* ── Users (trainers first — students reference trainer) ── */
INSERT INTO dbo.AspNetUsers (
    Id, FullName, LegacyUserId, AssignedTrainerUserId, TrainerLegacyId, CreatedAtUtc,
    UserName, NormalizedUserName, Email, NormalizedEmail, EmailConfirmed,
    PasswordHash, SecurityStamp, ConcurrencyStamp, PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnabled, AccessFailedCount
) VALUES
(@User_Admin,       N'Administrator',    N'admin',           NULL,              NULL,            SYSUTCDATETIME(), N'admin123@gmail.com',       N'ADMIN123@GMAIL.COM',       N'admin123@gmail.com',       N'ADMIN123@GMAIL.COM',       1, N'AQAAAAIAAYagAAAAEJNJ9z6sYGCl+IEEbMnKSG6k4IbVk7Ez2uqi+06TovDV7lH6W2p+X8cyRrR3g2rvPw==', N'LM24QXVMCAXN6FFETU5SCPGP3357LZUJ', N'85de3ff8-447e-4a86-90f9-80d7eac2e413', 0, 0, 1, 0),
(@User_Trainer2000, N'Trainer User 2000', N'trainer-2000',   NULL,              NULL,            SYSUTCDATETIME(), N'trainer2000@gmail.com',    N'TRAINER2000@GMAIL.COM',    N'trainer2000@gmail.com',    N'TRAINER2000@GMAIL.COM',    1, N'AQAAAAIAAYagAAAAEJVfPOtDEg4+EO/nO4lUmI4psgl9TdOlC3wqMtD+X1lcEngMuBkXWjNaIPLfa4hIng==', N'PYKV7N6CMJMDZVGG5GP56JEDFSHMRHR2', N'a45f8c6a-4125-4d0e-83ff-7799443c1ce5', 0, 0, 1, 0),
(@User_Trainer2003, N'Trainer User',      N'trainer-2003',   NULL,              NULL,            SYSUTCDATETIME(), N'trainer2003@gmail.com',    N'TRAINER2003@GMAIL.COM',    N'trainer2003@gmail.com',    N'TRAINER2003@GMAIL.COM',    1, N'AQAAAAIAAYagAAAAEHtVqQk292Ac+tE67ZuOH0W597YkYB/UeY+TcHFthRbxv96zVHXIckoHG/CDjyDZLg==', N'VJLXSAJTFODFGJPKPCXBSOEM4R3EJTTI', N'2380f880-e245-4b29-89cd-2c1d512e11b9', 0, 0, 1, 0),
(@User_Mohamed,     N'Mohamed Ali',       N'student-mohamed', @User_Trainer2003, N'trainer-2003', SYSUTCDATETIME(), N'mohamed.ali@example.com',  N'MOHAMED.ALI@EXAMPLE.COM',  N'mohamed.ali@example.com',  N'MOHAMED.ALI@EXAMPLE.COM',  1, N'AQAAAAIAAYagAAAAEPBUFF/j2glVEj4VdKJ/X8pFEwnfvU5ffbLVNoBfLCmrDkLNJ5IiXufLt2EYik6SnA==', N'BQTMMC7FFNXVZ7W7SXW7MJFPEINEDVCO', N'f9870e25-6d31-485e-937a-76b339449010', 0, 0, 1, 0),
(@User_Sara,        N'Sara Ahmed',        N'student-sara',    @User_Trainer2003, N'trainer-2003', SYSUTCDATETIME(), N'sara.ahmed@example.com',   N'SARA.AHMED@EXAMPLE.COM',   N'sara.ahmed@example.com',   N'SARA.AHMED@EXAMPLE.COM',   1, N'AQAAAAIAAYagAAAAEN6vvaHVaap2cYjJaGiAOoZSJTYqItqizHUeqoqdnnihsPmvyYrnxdo1ddtPfN6iVQ==', N'QFNZFNUQ3PPA4SJDZXWXGCHZWG6F7LDP', N'd1b7aac7-8c0e-463d-986b-d3698accf120', 0, 0, 1, 0),
(@User_Hassan,      N'Hassan Ibrahim',   N'student-hassan',  @User_Trainer2003, N'trainer-2003', SYSUTCDATETIME(), N'hassan@example.com',       N'HASSAN@EXAMPLE.COM',       N'hassan@example.com',       N'HASSAN@EXAMPLE.COM',       1, N'AQAAAAIAAYagAAAAEDFAvlsa8SuJE840L2C4RBt6IsmvblcgWOBVy8JqanlLcwnE0TkA1UjasVbDtaFzyA==', N'ZXL6PQSLMD7HQ6GT6FUDZ7BP2JMRAFPE', N'd1c91dc0-ea34-48d6-853f-91b6ecc24503', 0, 0, 1, 0);

INSERT INTO dbo.AspNetUserRoles (UserId, RoleId) VALUES
(@User_Admin, @Role_Admin),
(@User_Trainer2000, @Role_Trainer),
(@User_Trainer2003, @Role_Trainer),
(@User_Mohamed, @Role_Student),
(@User_Sara, @Role_Student),
(@User_Hassan, @Role_Student);

/* ── Branches & tracks ── */
INSERT INTO dbo.Branches (Id, Name, Region) VALUES
(N'cairo', N'Platform', N''), (N'alexandria', N'Alexandria', N''), (N'giza', N'Giza', N'');

INSERT INTO dbo.Tracks (Id, BranchId, Title, Icon, TrainingsCount, StudentsCount, IsActive) VALUES
(N'tr-fe', N'cairo', N'Frontend Development', N'code', 2, 27, 1),
(N'tr-be', N'cairo', N'Backend Development', N'db', 2, 28, 1),
(N'tr-mo', N'cairo', N'Mobile Development', N'mobile', 1, 14, 1),
(N'tr-ds', N'cairo', N'Data & AI', N'db', 1, 18, 1),
(N'atr-be', N'alexandria', N'Backend Development', N'db', 2, 22, 1),
(N'gtr-ds', N'giza', N'Data & AI', N'db', 2, 20, 1);

/* ── Trainings ── */
INSERT INTO dbo.Trainings (Id, BranchId, TrackId, Category, Title, Body, StartDate, TrainerUserId, TrainerLegacyId, TrainerEmail, TrainerName, TrainerInitials, SeatsTaken, SeatsTotal, Status, FilterTag) VALUES
(N'crt1', N'cairo', N'tr-fe', N'FRONTEND', N'React Fundamentals 2024', N'Learn React from scratch with hooks, context, and state management.', '2024-06-01', @User_Trainer2003, N'trainer-2003', N'trainer2003@gmail.com', N'Trainer User', N'AH', 15, 20, N'active', N'frontend'),
(N'crt2', N'cairo', N'tr-be', N'BACKEND', N'Node.js Advanced Patterns', N'Deep dive into APIs, auth, and scalable services.', '2024-07-01', @User_Trainer2003, N'trainer-2003', N'trainer2003@gmail.com', N'Trainer User', N'ME', 12, 18, N'active', N'backend'),
(N'crt3', N'cairo', N'tr-mo', N'MOBILE', N'Flutter Mobile Development', N'Cross-platform apps with Flutter and Firebase.', '2024-08-01', @User_Trainer2003, N'trainer-2003', N'trainer2003@gmail.com', N'Trainer User', N'OH', 8, 16, N'upcoming', N'mobile'),
(N'art1', N'alexandria', N'atr-be', N'BACKEND', N'Java Enterprise Lab', N'Spring Boot services and integration tests.', '2024-09-01', NULL, NULL, NULL, N'Layla Kamal', N'LK', 10, 14, N'active', N'backend'),
(N'grt1', N'giza', N'gtr-ds', N'DATA', N'Python for Analytics', N'Pandas, visualization, and reporting pipelines.', '2024-10-01', NULL, NULL, NULL, N'Yousef Adel', N'YA', 14, 20, N'active', N'backend');

/* ── Training sections ── */
INSERT INTO dbo.TrainingSections (Id, Title, Company, DurationLabel, Status, TasksCount, TrainerUserId, TrainerLegacyId) VALUES
(N'web-development-bootcamp', N'Web Development Bootcamp', N'TechCorp', N'2024-01-15 - 2024-04-15', N'Active', 4, @User_Trainer2003, N'trainer-2003'),
(N'mobile-app-development', N'Mobile App Development', N'AppFactory', N'2024-02-01 - 2024-05-01', N'Active', 4, @User_Trainer2003, N'trainer-2003'),
(N'data-science-fundamentals', N'Data Science Fundamentals', N'DataWorks', N'2023-09-01 - 2023-12-01', N'Completed', 6, @User_Trainer2003, N'trainer-2003');

INSERT INTO dbo.SectionEnrollments (SectionId, StudentUserId, StudentLegacyId, ProgressPercent, CompletedTasks, TotalTasks) VALUES
(N'web-development-bootcamp', @User_Mohamed, N'student-mohamed', 75, 6, 8),
(N'web-development-bootcamp', @User_Sara,    N'student-sara',    60, 4, 8),
(N'web-development-bootcamp', @User_Hassan,  N'student-hassan',  45, 3, 8);

/* ── Company posts & job applicants ── */
INSERT INTO dbo.CompanyPosts (Id, BranchId, Title, Status, Body, TrainingTitle, Deadline, ApplicantsCount, Tags) VALUES
(N'p1', N'cairo', N'Frontend Developer Internship — React', N'PUBLISHED', N'Join our team as a frontend developer intern.', N'React Fundamentals 2024', '2024-05-15', 24, N'React,TypeScript,CSS,Git'),
(N'p2', N'cairo', N'Backend Developer Position — Node.js', N'PENDING', N'Work with Node.js, databases, and API development.', N'Node.js Advanced', '2024-05-20', 18, N'Node.js,PostgreSQL,REST API,Docker'),
(N'ap1', N'alexandria', N'Cloud Intern — AWS', N'PUBLISHED', N'Hands-on cloud foundations and deployments.', N'Cloud Fundamentals', '2024-06-10', 14, N'AWS,Linux,CI/CD');

INSERT INTO dbo.JobApplicants (Id, BranchId, ApplicantInitial, FullName, Email, TrainingTitle, Status, AppliedOn) VALUES
(N't1', N'cairo', N'H', N'Hassan Ibrahim', N'hassan@example.com', N'Backend Developer Position…', N'INTERVIEWED', '2024-04-12'),
(N't3', N'cairo', N'M', N'Mohamed Ali', N'mohamed.ali@example.com', N'Frontend Developer Internship…', N'PENDING', '2024-04-14'),
(N't4', N'cairo', N'S', N'Sara Ahmed', N'sara.ahmed@example.com', N'UI/UX Designer…', N'PENDING', '2024-04-13');

/* ── Enrollment applications ── */
INSERT INTO dbo.EnrollmentApplications (
    Id, StudentUserId, UserLegacyId, UserEmail, UserName, BranchId, CourseId, CourseTitle,
    TrainerUserId, TrainerLegacyId, TrainerEmail, TrainerName, MotivationReason, UniversityName, Major, Gpa, Status, CreatedAtUtc, UpdatedAtUtc
) VALUES
(N'enr-mohamed-crt1', @User_Mohamed, N'student-mohamed', N'mohamed.ali@example.com', N'Mohamed Ali', N'cairo', N'crt1', N'React Fundamentals 2024', @User_Trainer2003, N'trainer-2003', N'trainer2003@gmail.com', N'Trainer User', N'I want to build production-ready React apps.', N'Cairo University', N'Computer Science', N'3.6', N'approved', DATEADD(DAY,-14,SYSUTCDATETIME()), DATEADD(DAY,-10,SYSUTCDATETIME())),
(N'enr-sara-crt2',    @User_Sara,    N'student-sara',    N'sara.ahmed@example.com',   N'Sara Ahmed',    N'cairo', N'crt2', N'Node.js Advanced Patterns', @User_Trainer2003, N'trainer-2003', N'trainer2003@gmail.com', N'Trainer User', N'Interested in backend architecture.', N'Ain Shams University', N'Software Engineering', N'3.4', N'pending', DATEADD(DAY,-3,SYSUTCDATETIME()), DATEADD(DAY,-3,SYSUTCDATETIME())),
(N'enr-hassan-crt1',  @User_Hassan,  N'student-hassan',  N'hassan@example.com',       N'Hassan Ibrahim', N'cairo', N'crt1', N'React Fundamentals 2024', @User_Trainer2003, N'trainer-2003', N'trainer2003@gmail.com', N'Trainer User', N'Career switch into frontend development.', N'Helwan University', N'IT', N'3.2', N'pending', DATEADD(DAY,-1,SYSUTCDATETIME()), DATEADD(DAY,-1,SYSUTCDATETIME()));

INSERT INTO dbo.PortalNotifications (Id, UserId, UserLegacyId, Title, Message, Tone, IsRead, CreatedAtUtc, Type, ApplicationId, BranchId, CourseId, CourseTitle, TargetView) VALUES
(N'notif-trainer-enr1', @User_Trainer2003, N'trainer-2003', N'New enrollment request', N'Sara Ahmed applied for Node.js Advanced Patterns.', N'info', 0, DATEADD(DAY,-3,SYSUTCDATETIME()), N'enrollment_request', N'enr-sara-crt2', N'cairo', N'crt2', N'Node.js Advanced Patterns', N'enrollment-requests'),
(N'notif-trainer-enr2', @User_Trainer2003, N'trainer-2003', N'New enrollment request', N'Hassan Ibrahim applied for React Fundamentals 2024.', N'info', 0, DATEADD(DAY,-1,SYSUTCDATETIME()), N'enrollment_request', N'enr-hassan-crt1', N'cairo', N'crt1', N'React Fundamentals 2024', N'enrollment-requests');

/* ── Tasks (insert without LastSubmissionId first) ── */
INSERT INTO dbo.Tasks (Id, StudentUserId, StudentLegacyId, SectionId, Title, Description, DeadlineUtc, SubmissionStatus, LastSubmissionId) VALUES
(N'task-ts-101', @User_Mohamed, N'student-mohamed', N'web-development-bootcamp', N'API integration checkpoint', N'Connect the dashboard to authenticated endpoints and handle 401/403 states.', DATEADD(DAY,4,SYSUTCDATETIME()), N'Pending Review', NULL),
(N'task-ts-102', @User_Mohamed, N'student-mohamed', N'web-development-bootcamp', N'Weekly learning journal', N'Submit a short reflection on blockers, learnings, and next steps.', DATEADD(DAY,1,SYSUTCDATETIME()), N'Not Submitted', NULL),
(N'task-ts-103', @User_Mohamed, N'student-mohamed', N'web-development-bootcamp', N'Capstone wireframes', N'Low-fidelity wireframes for the internship reporting module.', DATEADD(DAY,10,SYSUTCDATETIME()), N'Completed', NULL),
(N'task-ts-201', @User_Sara,    N'student-sara',    N'web-development-bootcamp', N'Security review checklist', N'Complete the secure coding checklist for your assigned service.', DATEADD(DAY,3,SYSUTCDATETIME()), N'Not Submitted', NULL),
(N'task-ts-202', @User_Sara,    N'student-sara',    N'web-development-bootcamp', N'Unit tests for validators', N'Add tests covering edge cases for input validation helpers.', DATEADD(DAY,6,SYSUTCDATETIME()), N'Pending Review', NULL),
(N'task-ts-301', @User_Hassan,  N'student-hassan',  N'web-development-bootcamp', N'Onboarding quiz', N'Finish the platform onboarding knowledge check.', DATEADD(DAY,-1,SYSUTCDATETIME()), N'Overdue', NULL);

INSERT INTO dbo.TaskSubmissions (Id, StudentUserId, StudentLegacyId, TaskId, SubmissionLink, FileName, Notes, SubmittedAtUtc) VALUES
(N'sub-demo-1', @User_Mohamed, N'student-mohamed', N'task-ts-101', N'https://example.com/mohamed/api-checkpoint', N'api-notes.pdf', N'Initial submission for review.', DATEADD(DAY,-1,SYSUTCDATETIME()));

UPDATE dbo.Tasks SET LastSubmissionId = N'sub-demo-1' WHERE Id = N'task-ts-101';

/* ── Messages ── */
INSERT INTO dbo.Messages (Id, SenderUserId, SenderLegacyId, ReceiverUserId, ReceiverLegacyId, SenderRole, ReceiverRole, Content, TaskId, TimestampUtc) VALUES
(N'msg-001', @User_Trainer2003, N'trainer-2003', @User_Mohamed, N'student-mohamed', N'Trainer', N'Student', N'Please submit the API integration task by Friday.', N'task-ts-101', DATEADD(HOUR,-6,SYSUTCDATETIME())),
(N'msg-002', @User_Mohamed,     N'student-mohamed', @User_Trainer2003, N'trainer-2003', N'Student', N'Trainer', N'Understood. I will submit before deadline.', NULL, DATEADD(HOUR,-5,SYSUTCDATETIME()));

/* ── Trainer feedback ── */
INSERT INTO dbo.TrainerFeedback (Id, StudentUserId, StudentLegacyId, TrainerUserId, TaskTitle, TrainerName, Comment, Grade, AtUtc) VALUES
(N'fb-1', @User_Mohamed, N'student-mohamed', @User_Trainer2003, N'API integration checkpoint', N'Trainer User', N'Nice error handling on auth failures. Tighten retry backoff defaults.', N'A-', DATEADD(DAY,-1,SYSUTCDATETIME())),
(N'fb-0', @User_Mohamed, N'student-mohamed', @User_Trainer2003, N'Capstone wireframes', N'Trainer User', N'Flows are clear; add empty states for the reporting table.', N'B+', DATEADD(DAY,-6,SYSUTCDATETIME())),
(N'fb-generic', @User_Sara, N'student-sara', NULL, N'Weekly deliverables', N'Assigned trainer', N'Great momentum this week. Focus on test coverage next sprint.', N'B', DATEADD(DAY,-2,SYSUTCDATETIME()));

/* ── Evaluations ── */
INSERT INTO dbo.TraineeEvaluations (Id, StudentUserId, StudentLegacyId, TraineeName, PendingCount) VALUES
(N'mohamed-ali', @User_Mohamed, N'student-mohamed', N'Mohamed Ali', 1),
(N'hassan-ibrahim', @User_Hassan, N'student-hassan', N'Hassan Ibrahim', 1),
(N'fatma-zahra', NULL, NULL, N'Fatma Zahra', 1);

INSERT INTO dbo.EvaluationTaskItems (Id, EvaluationId, Title, Deadline, SubmittedOn, RepoTag, RepoBranch, Status) VALUES
(N'ev-m1', N'mohamed-ali', N'Create Landing Page', '2024-02-15', '2024-02-14', N'landing-page-project', N'main', N'Evaluated'),
(N'ev-m2', N'mohamed-ali', N'Build Authentication', '2024-03-01', '2024-02-28', N'landing-page-project', N'main', N'Pending Evaluation'),
(N'ev-m3', N'mohamed-ali', N'Dashboard Layout', '2024-03-15', NULL, N'landing-page-project', N'main', N'Not Submitted'),
(N'ev-h1', N'hassan-ibrahim', N'Create Landing Page', '2024-02-16', '2024-02-15', N'landing-page-project', N'main', N'Pending Evaluation'),
(N'ev-f1', N'fatma-zahra', N'Sub Active Directory', '2024-02-20', '2024-02-19', N'ad-lab', N'main', N'Pending Evaluation');

/* ── Internships ── */
INSERT INTO dbo.InternshipPrograms (Id, Title, Company, Specialization, TrainingType, Summary, OpensOnUtc, ClosesOnUtc) VALUES
(N'prog-cloud-01', N'Cloud reliability intern', N'Northwind Labs', N'Cloud / DevOps', N'Internship', N'Shadow on-call rotations, build runbooks, and automate health checks.', DATEADD(MONTH,-1,SYSUTCDATETIME()), DATEADD(MONTH,2,SYSUTCDATETIME())),
(N'prog-sec-02', N'Application security residency', N'Contoso Security', N'Cybersecurity', N'Residency', N'Threat modeling, secure code review, and tooling integration sprints.', DATEADD(DAY,-14,SYSUTCDATETIME()), DATEADD(DAY,30,SYSUTCDATETIME())),
(N'prog-fe-03', N'Product engineering trainee', N'Fabrikam Digital', N'Frontend', N'Traineeship', N'Ship UI experiments, instrument analytics, and pair with designers.', DATEADD(DAY,-7,SYSUTCDATETIME()), DATEADD(DAY,45,SYSUTCDATETIME()));

INSERT INTO dbo.InternshipApplications (Id, StudentUserId, StudentLegacyId, ProgramId, Status, CoverLetter, CvFileName, CreatedAtUtc) VALUES
(N'app-demo-1', @User_Mohamed, N'student-mohamed', N'prog-cloud-01', N'Pending', N'Excited about reliability work and on-call culture.', N'Mohamed_Ali_CV.pdf', DATEADD(DAY,-5,SYSUTCDATETIME()));

INSERT INTO dbo.InternshipApplicationTimelineSteps (Id, ApplicationId, StepOrder, Label, State, AtUtc) VALUES
('11111111-1111-1111-1111-111111111101', N'app-demo-1', 1, N'Application received', N'Complete', DATEADD(DAY,-5,SYSUTCDATETIME())),
('11111111-1111-1111-1111-111111111102', N'app-demo-1', 2, N'Recruiter screen', N'In progress', DATEADD(DAY,-3,SYSUTCDATETIME())),
('11111111-1111-1111-1111-111111111103', N'app-demo-1', 3, N'Technical interview', N'Upcoming', DATEADD(DAY,2,SYSUTCDATETIME()));

INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion) VALUES
(N'20260607072845_InitialIdentityAuth', N'8.0.8');
GO

/* ═══════════════════════════════════════════════════════════════════════════
   VERIFICATION — row counts + FK integrity spot-check
   ═══════════════════════════════════════════════════════════════════════════ */
SELECT N'Auth' AS Area, N'AspNetUsers' AS [Table], COUNT(*) AS [Rows] FROM dbo.AspNetUsers
UNION ALL SELECT N'Catalog', N'Branches', COUNT(*) FROM dbo.Branches
UNION ALL SELECT N'Catalog', N'Tracks', COUNT(*) FROM dbo.Tracks
UNION ALL SELECT N'Catalog', N'Trainings', COUNT(*) FROM dbo.Trainings
UNION ALL SELECT N'Workspace', N'TrainingSections', COUNT(*) FROM dbo.TrainingSections
UNION ALL SELECT N'Workspace', N'SectionEnrollments', COUNT(*) FROM dbo.SectionEnrollments
UNION ALL SELECT N'Enrollment', N'EnrollmentApplications', COUNT(*) FROM dbo.EnrollmentApplications
UNION ALL SELECT N'Tasks', N'Tasks', COUNT(*) FROM dbo.Tasks
UNION ALL SELECT N'Tasks', N'TaskSubmissions', COUNT(*) FROM dbo.TaskSubmissions
UNION ALL SELECT N'Comms', N'Messages', COUNT(*) FROM dbo.Messages
UNION ALL SELECT N'Internships', N'InternshipApplications', COUNT(*) FROM dbo.InternshipApplications
ORDER BY Area, [Table];

/* Orphan detection (should return 0 rows each) */
SELECT N'Orphan Tasks.StudentUserId' AS Issue, t.Id FROM dbo.Tasks t
    LEFT JOIN dbo.AspNetUsers u ON u.Id = t.StudentUserId WHERE u.Id IS NULL
UNION ALL
SELECT N'Orphan EnrollmentApplications.CourseId', e.Id FROM dbo.EnrollmentApplications e
    LEFT JOIN dbo.Trainings tr ON tr.Id = e.CourseId WHERE tr.Id IS NULL
UNION ALL
SELECT N'Orphan Messages.TaskId', m.Id FROM dbo.Messages m
    WHERE m.TaskId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Tasks t WHERE t.Id = m.TaskId);
GO

PRINT N'IT Connect v2.0 enterprise schema deployed successfully.';
GO

/*
═══════════════════════════════════════════════════════════════════════════════
 SCHEMA SIMPLIFICATION SUGGESTIONS (production roadmap)
═══════════════════════════════════════════════════════════════════════════════

1. REMOVE REDUNDANT DENORMALIZED COLUMNS (phase out LegacyUserId)
   - Once API migrates to AspNetUsers.Id, drop: StudentLegacyId, TrainerLegacyId,
     UserLegacyId, SenderLegacyId, ReceiverLegacyId from child tables.
   - Keep ONLY LegacyUserId on AspNetUsers as external slug if needed.

2. MERGE TrainingSections vs Trainings
   - Today: Trainings = catalog course; TrainingSections = trainer workspace cohort.
   - Production: single Trainings table + TrainingCohorts (section instances per term).

3. NORMALIZE CompanyPosts.Tags
   - Replace comma-separated Tags with PostTags (PostId, TagId) + Tags lookup table.

4. LINK JobApplicants TO AspNetUsers (optional)
   - Add ApplicantUserId FK when external applicants register accounts.

5. ADD TrainerFeedback.TaskId FK
   - Link feedback to Tasks.Id instead of denormalized TaskTitle string.

6. RENAME FOR CLARITY
   - Trainings → Courses (LMS standard)
   - TrainingSections → Cohorts or ClassSections
   - EnrollmentApplications → CourseEnrollments

7. ADD AUDIT COLUMNS
   - CreatedByUserId, UpdatedByUserId, RowVersion on business tables.

8. CONSIDER UNIQUE CONSTRAINTS
   - UX_EnrollmentApplications_Student_Course (StudentUserId, CourseId) WHERE active
   - UX_SectionEnrollments already enforced via PK

9. COMPUTED COLUMNS / VIEWS
   - vw_StudentDashboard, vw_TrainerRoster to replace denormalized counts
     (Tracks.TrainingsCount, Tracks.StudentsCount should be computed, not stored).

10. SOFT DELETE
    - IsDeleted + DeletedAtUtc on Trainings, Tasks, Enrollments for audit compliance.
*/
