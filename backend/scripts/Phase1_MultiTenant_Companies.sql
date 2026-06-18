/*
  Phase 1 — Multi-Tenant preparation (database only)
  Database: ITConnectDb_v3

  - Creates dbo.Companies
  - Adds nullable CompanyId to catalog/enrollment tables
  - Adds FK constraints and indexes
  - Does NOT remove BranchId, migrate data, or change application behavior

  Safe to re-run (idempotent).
*/
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ── 1. Companies table ─────────────────────────────────────────────────── */
IF OBJECT_ID(N'dbo.Companies', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Companies (
        Id        NVARCHAR(64)  NOT NULL,
        Name      NVARCHAR(200) NOT NULL,
        Slug      NVARCHAR(120) NOT NULL,
        Email     NVARCHAR(256) NULL,
        Phone     NVARCHAR(32)  NULL,
        LogoUrl   NVARCHAR(500) NULL,
        IsActive  BIT           NOT NULL CONSTRAINT DF_Companies_IsActive DEFAULT (1),
        CreatedAt DATETIME2(3)  NOT NULL CONSTRAINT DF_Companies_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(3)  NOT NULL CONSTRAINT DF_Companies_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Companies PRIMARY KEY CLUSTERED (Id)
    );

    CREATE UNIQUE INDEX UX_Companies_Slug ON dbo.Companies (Slug);
    CREATE INDEX IX_Companies_IsActive ON dbo.Companies (IsActive) WHERE IsActive = 1;
END
GO

/* ── 2. Add nullable CompanyId columns ──────────────────────────────────── */
IF COL_LENGTH('dbo.Tracks', 'CompanyId') IS NULL
    ALTER TABLE dbo.Tracks ADD CompanyId NVARCHAR(64) NULL;
GO

IF COL_LENGTH('dbo.Trainings', 'CompanyId') IS NULL
    ALTER TABLE dbo.Trainings ADD CompanyId NVARCHAR(64) NULL;
GO

IF COL_LENGTH('dbo.CompanyPosts', 'CompanyId') IS NULL
    ALTER TABLE dbo.CompanyPosts ADD CompanyId NVARCHAR(64) NULL;
GO

IF COL_LENGTH('dbo.JobApplicants', 'CompanyId') IS NULL
    ALTER TABLE dbo.JobApplicants ADD CompanyId NVARCHAR(64) NULL;
GO

IF COL_LENGTH('dbo.EnrollmentApplications', 'CompanyId') IS NULL
    ALTER TABLE dbo.EnrollmentApplications ADD CompanyId NVARCHAR(64) NULL;
GO

IF COL_LENGTH('dbo.TrainingSections', 'CompanyId') IS NULL
    ALTER TABLE dbo.TrainingSections ADD CompanyId NVARCHAR(64) NULL;
GO

IF COL_LENGTH('dbo.InternshipPrograms', 'CompanyId') IS NULL
    ALTER TABLE dbo.InternshipPrograms ADD CompanyId NVARCHAR(64) NULL;
GO

IF COL_LENGTH('dbo.PortalNotifications', 'CompanyId') IS NULL
    ALTER TABLE dbo.PortalNotifications ADD CompanyId NVARCHAR(64) NULL;
GO

/* ── 3. Foreign keys (SET NULL — existing rows stay valid) ─────────────── */
IF OBJECT_ID(N'dbo.FK_Tracks_CompanyId', N'F') IS NULL
    ALTER TABLE dbo.Tracks
        ADD CONSTRAINT FK_Tracks_CompanyId
        FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL;
GO

IF OBJECT_ID(N'dbo.FK_Trainings_CompanyId', N'F') IS NULL
    ALTER TABLE dbo.Trainings
        ADD CONSTRAINT FK_Trainings_CompanyId
        FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL;
GO

IF OBJECT_ID(N'dbo.FK_CompanyPosts_CompanyId', N'F') IS NULL
    ALTER TABLE dbo.CompanyPosts
        ADD CONSTRAINT FK_CompanyPosts_CompanyId
        FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL;
GO

IF OBJECT_ID(N'dbo.FK_JobApplicants_CompanyId', N'F') IS NULL
    ALTER TABLE dbo.JobApplicants
        ADD CONSTRAINT FK_JobApplicants_CompanyId
        FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL;
GO

IF OBJECT_ID(N'dbo.FK_Enrollment_CompanyId', N'F') IS NULL
    ALTER TABLE dbo.EnrollmentApplications
        ADD CONSTRAINT FK_Enrollment_CompanyId
        FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL;
GO

IF OBJECT_ID(N'dbo.FK_TrainingSections_CompanyId', N'F') IS NULL
    ALTER TABLE dbo.TrainingSections
        ADD CONSTRAINT FK_TrainingSections_CompanyId
        FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL;
GO

IF OBJECT_ID(N'dbo.FK_InternshipPrograms_CompanyId', N'F') IS NULL
    ALTER TABLE dbo.InternshipPrograms
        ADD CONSTRAINT FK_InternshipPrograms_CompanyId
        FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL;
GO

IF OBJECT_ID(N'dbo.FK_Notifications_CompanyId', N'F') IS NULL
    ALTER TABLE dbo.PortalNotifications
        ADD CONSTRAINT FK_Notifications_CompanyId
        FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL;
GO

/* ── 4. Indexes on CompanyId ────────────────────────────────────────────── */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Tracks_CompanyId' AND object_id = OBJECT_ID(N'dbo.Tracks'))
    CREATE INDEX IX_Tracks_CompanyId ON dbo.Tracks (CompanyId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Trainings_CompanyId' AND object_id = OBJECT_ID(N'dbo.Trainings'))
    CREATE INDEX IX_Trainings_CompanyId ON dbo.Trainings (CompanyId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyPosts_CompanyId' AND object_id = OBJECT_ID(N'dbo.CompanyPosts'))
    CREATE INDEX IX_CompanyPosts_CompanyId ON dbo.CompanyPosts (CompanyId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_JobApplicants_CompanyId' AND object_id = OBJECT_ID(N'dbo.JobApplicants'))
    CREATE INDEX IX_JobApplicants_CompanyId ON dbo.JobApplicants (CompanyId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Enrollment_CompanyId' AND object_id = OBJECT_ID(N'dbo.EnrollmentApplications'))
    CREATE INDEX IX_Enrollment_CompanyId ON dbo.EnrollmentApplications (CompanyId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TrainingSections_CompanyId' AND object_id = OBJECT_ID(N'dbo.TrainingSections'))
    CREATE INDEX IX_TrainingSections_CompanyId ON dbo.TrainingSections (CompanyId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_InternshipPrograms_CompanyId' AND object_id = OBJECT_ID(N'dbo.InternshipPrograms'))
    CREATE INDEX IX_InternshipPrograms_CompanyId ON dbo.InternshipPrograms (CompanyId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Notifications_CompanyId' AND object_id = OBJECT_ID(N'dbo.PortalNotifications'))
    CREATE INDEX IX_Notifications_CompanyId ON dbo.PortalNotifications (CompanyId);
GO

PRINT 'Phase1_MultiTenant_Companies.sql completed successfully.';
GO
