/*
  Phase 3 — Company portal data (SQL persistence for localStorage shapes)
  Database: ITConnectDb_v3

  - Extends dbo.Companies with public profile fields
  - Creates tables for company trainers, requests, selected tracks
  - All new rows link to Companies via nullable CompanyId (+ CompanyEmail for dual-mode)
  - BranchId preserved where localStorage uses it
  - Does NOT migrate data, delete localStorage, or change APIs

  Requires Phase 1 (Companies). Safe to re-run (idempotent).
*/
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.Companies', N'U') IS NULL
BEGIN
    RAISERROR('Phase 1 required: dbo.Companies does not exist.', 16, 1);
    RETURN;
END
GO

/* ── Extend Companies (maps Company Profiles localStorage) ──────────────── */
IF COL_LENGTH('dbo.Companies', 'Industry') IS NULL
    ALTER TABLE dbo.Companies ADD Industry NVARCHAR(120) NULL;
GO
IF COL_LENGTH('dbo.Companies', 'Location') IS NULL
    ALTER TABLE dbo.Companies ADD Location NVARCHAR(200) NULL;
GO
IF COL_LENGTH('dbo.Companies', 'Vision') IS NULL
    ALTER TABLE dbo.Companies ADD Vision NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH('dbo.Companies', 'Description') IS NULL
    ALTER TABLE dbo.Companies ADD Description NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH('dbo.Companies', 'LegacyLocalId') IS NULL
    ALTER TABLE dbo.Companies ADD LegacyLocalId NVARCHAR(64) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Companies_LegacyLocalId' AND object_id = OBJECT_ID(N'dbo.Companies'))
    CREATE INDEX IX_Companies_LegacyLocalId ON dbo.Companies (LegacyLocalId) WHERE LegacyLocalId IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Companies_Email' AND object_id = OBJECT_ID(N'dbo.Companies'))
    CREATE INDEX IX_Companies_Email ON dbo.Companies (Email) WHERE Email IS NOT NULL;
GO

/* ── Company Trainers (itconnect_company_trainers_v1) ───────────────────── */
IF OBJECT_ID(N'dbo.CompanyTrainers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompanyTrainers (
        Id               NVARCHAR(64)  NOT NULL,
        CompanyId        NVARCHAR(64)  NULL,
        CompanyEmail     NVARCHAR(256) NOT NULL,
        FullName         NVARCHAR(120) NOT NULL,
        Email            NVARCHAR(256) NOT NULL,
        CompanyPosition  NVARCHAR(120) NULL,
        LegacyLocalId    NVARCHAR(64)  NULL,
        CreatedAt        DATETIME2(3)  NOT NULL CONSTRAINT DF_CompanyTrainers_CreatedAt DEFAULT (SYSUTCDATETIME()),
        IsDeleted        BIT           NOT NULL CONSTRAINT DF_CompanyTrainers_IsDeleted DEFAULT (0),
        CONSTRAINT PK_CompanyTrainers PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_CompanyTrainers_CompanyId
            FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyTrainers_CompanyId' AND object_id = OBJECT_ID(N'dbo.CompanyTrainers'))
    CREATE INDEX IX_CompanyTrainers_CompanyId ON dbo.CompanyTrainers (CompanyId) WHERE IsDeleted = 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyTrainers_CompanyEmail' AND object_id = OBJECT_ID(N'dbo.CompanyTrainers'))
    CREATE INDEX IX_CompanyTrainers_CompanyEmail ON dbo.CompanyTrainers (CompanyEmail) WHERE IsDeleted = 0;
GO

IF OBJECT_ID(N'dbo.CompanyTrainerLinkedTracks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompanyTrainerLinkedTracks (
        TrainerId   NVARCHAR(64)  NOT NULL,
        SortOrder   INT           NOT NULL CONSTRAINT DF_CompanyTrainerTracks_Sort DEFAULT (0),
        TrackTitle  NVARCHAR(200) NOT NULL,
        CONSTRAINT PK_CompanyTrainerLinkedTracks PRIMARY KEY CLUSTERED (TrainerId, TrackTitle),
        CONSTRAINT FK_CompanyTrainerLinkedTracks_TrainerId
            FOREIGN KEY (TrainerId) REFERENCES dbo.CompanyTrainers(Id) ON DELETE CASCADE
    );
END
GO

/* ── Company Track Requests (itconnect_company_track_requests_v1) ───────── */
IF OBJECT_ID(N'dbo.CompanyTrackRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompanyTrackRequests (
        Id                 NVARCHAR(64)  NOT NULL,
        CompanyId          NVARCHAR(64)  NULL,
        CompanyEmail       NVARCHAR(256) NULL,
        BranchId           NVARCHAR(64)  NOT NULL,
        Title              NVARCHAR(200) NOT NULL,
        Description        NVARCHAR(MAX) NULL,
        RequestedBy        NVARCHAR(120) NULL,
        RequestedByEmail   NVARCHAR(256) NULL,
        Status             NVARCHAR(32)  NOT NULL CONSTRAINT DF_CompanyTrackReq_Status DEFAULT (N'PENDING'),
        ReviewedAt         DATETIME2(3)  NULL,
        ReviewedBy         NVARCHAR(120) NULL,
        LegacyLocalId      NVARCHAR(64)  NULL,
        CreatedAt          DATETIME2(3)  NOT NULL CONSTRAINT DF_CompanyTrackReq_CreatedAt DEFAULT (SYSUTCDATETIME()),
        IsDeleted          BIT           NOT NULL CONSTRAINT DF_CompanyTrackReq_IsDeleted DEFAULT (0),
        CONSTRAINT PK_CompanyTrackRequests PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_CompanyTrackRequests_CompanyId
            FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL,
        CONSTRAINT FK_CompanyTrackRequests_BranchId
            FOREIGN KEY (BranchId) REFERENCES dbo.Branches(Id) ON DELETE NO ACTION
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyTrackRequests_CompanyId' AND object_id = OBJECT_ID(N'dbo.CompanyTrackRequests'))
    CREATE INDEX IX_CompanyTrackRequests_CompanyId ON dbo.CompanyTrackRequests (CompanyId) WHERE IsDeleted = 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyTrackRequests_BranchId_Status' AND object_id = OBJECT_ID(N'dbo.CompanyTrackRequests'))
    CREATE INDEX IX_CompanyTrackRequests_BranchId_Status ON dbo.CompanyTrackRequests (BranchId, Status) WHERE IsDeleted = 0;
GO

/* ── Company Training Requests (itconnect_company_training_requests_v1) ─ */
IF OBJECT_ID(N'dbo.CompanyTrainingRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompanyTrainingRequests (
        Id                      NVARCHAR(64)  NOT NULL,
        CompanyId               NVARCHAR(64)  NULL,
        CompanyEmail            NVARCHAR(256) NULL,
        BranchId                NVARCHAR(64)  NOT NULL,
        Title                   NVARCHAR(300) NOT NULL,
        Body                    NVARCHAR(MAX) NULL,
        TrackRequestId          NVARCHAR(64)  NULL,
        TrackTitle              NVARCHAR(200) NULL,
        TrainerName             NVARCHAR(120) NULL,
        TrainerEmail            NVARCHAR(256) NULL,
        StartDate               DATE          NULL,
        SeatsTotal              INT           NOT NULL CONSTRAINT DF_CompanyTrainReq_Seats DEFAULT (20),
        TrainingStatus          NVARCHAR(32)  NOT NULL CONSTRAINT DF_CompanyTrainReq_TrainStatus DEFAULT (N'active'),
        DocumentFileName        NVARCHAR(260) NULL,
        DocumentDataUrl         NVARCHAR(MAX) NULL,
        RequestedBy             NVARCHAR(120) NULL,
        RequestedByEmail        NVARCHAR(256) NULL,
        ReviewStatus            NVARCHAR(32)  NOT NULL CONSTRAINT DF_CompanyTrainReq_ReviewStatus DEFAULT (N'PENDING'),
        ReviewedAt              DATETIME2(3)  NULL,
        ReviewedBy              NVARCHAR(120) NULL,
        PublishedTrainingId     NVARCHAR(64)  NULL,
        LegacyLocalId           NVARCHAR(64)  NULL,
        CreatedAt               DATETIME2(3)  NOT NULL CONSTRAINT DF_CompanyTrainReq_CreatedAt DEFAULT (SYSUTCDATETIME()),
        IsDeleted               BIT           NOT NULL CONSTRAINT DF_CompanyTrainReq_IsDeleted DEFAULT (0),
        CONSTRAINT PK_CompanyTrainingRequests PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_CompanyTrainingRequests_CompanyId
            FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL,
        CONSTRAINT FK_CompanyTrainingRequests_BranchId
            FOREIGN KEY (BranchId) REFERENCES dbo.Branches(Id) ON DELETE NO ACTION
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyTrainingRequests_CompanyId' AND object_id = OBJECT_ID(N'dbo.CompanyTrainingRequests'))
    CREATE INDEX IX_CompanyTrainingRequests_CompanyId ON dbo.CompanyTrainingRequests (CompanyId) WHERE IsDeleted = 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyTrainingRequests_BranchId' AND object_id = OBJECT_ID(N'dbo.CompanyTrainingRequests'))
    CREATE INDEX IX_CompanyTrainingRequests_BranchId ON dbo.CompanyTrainingRequests (BranchId) WHERE IsDeleted = 0;
GO

/* ── Company Post Requests (itconnect_company_post_requests_v1) ─────────── */
IF OBJECT_ID(N'dbo.CompanyPostRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompanyPostRequests (
        Id                         NVARCHAR(64)  NOT NULL,
        CompanyId                  NVARCHAR(64)  NULL,
        CompanyEmail               NVARCHAR(256) NULL,
        BranchId                   NVARCHAR(64)  NOT NULL,
        Title                      NVARCHAR(300) NOT NULL,
        Body                       NVARCHAR(MAX) NULL,
        TrainingTitle              NVARCHAR(300) NULL,
        CompanyTrainingRequestId   NVARCHAR(64)  NULL,
        SkillsRaw                  NVARCHAR(500) NULL,
        Deadline                   DATE          NULL,
        RequestedBy                NVARCHAR(120) NULL,
        RequestedByEmail           NVARCHAR(256) NULL,
        ReviewStatus               NVARCHAR(32)  NOT NULL CONSTRAINT DF_CompanyPostReq_ReviewStatus DEFAULT (N'PENDING'),
        ReviewedAt                 DATETIME2(3)  NULL,
        ReviewedBy                 NVARCHAR(120) NULL,
        LegacyLocalId              NVARCHAR(64)  NULL,
        CreatedAt                  DATETIME2(3)  NOT NULL CONSTRAINT DF_CompanyPostReq_CreatedAt DEFAULT (SYSUTCDATETIME()),
        IsDeleted                  BIT           NOT NULL CONSTRAINT DF_CompanyPostReq_IsDeleted DEFAULT (0),
        CONSTRAINT PK_CompanyPostRequests PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_CompanyPostRequests_CompanyId
            FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL,
        CONSTRAINT FK_CompanyPostRequests_BranchId
            FOREIGN KEY (BranchId) REFERENCES dbo.Branches(Id) ON DELETE NO ACTION
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyPostRequests_CompanyId' AND object_id = OBJECT_ID(N'dbo.CompanyPostRequests'))
    CREATE INDEX IX_CompanyPostRequests_CompanyId ON dbo.CompanyPostRequests (CompanyId) WHERE IsDeleted = 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyPostRequests_BranchId' AND object_id = OBJECT_ID(N'dbo.CompanyPostRequests'))
    CREATE INDEX IX_CompanyPostRequests_BranchId ON dbo.CompanyPostRequests (BranchId) WHERE IsDeleted = 0;
GO

/* ── Company Selected Tracks (itconnect_company_selected_tracks_v1) ─────── */
IF OBJECT_ID(N'dbo.CompanySelectedTracks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompanySelectedTracks (
        Id           NVARCHAR(64)  NOT NULL,
        CompanyId    NVARCHAR(64)  NULL,
        CompanyEmail NVARCHAR(256) NOT NULL,
        TrackValue   NVARCHAR(200) NOT NULL,
        Title        NVARCHAR(200) NULL,
        AddedAt      DATETIME2(3)  NOT NULL CONSTRAINT DF_CompanySelectedTracks_AddedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_CompanySelectedTracks PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_CompanySelectedTracks_CompanyId
            FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE SET NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanySelectedTracks_CompanyId' AND object_id = OBJECT_ID(N'dbo.CompanySelectedTracks'))
    CREATE INDEX IX_CompanySelectedTracks_CompanyId ON dbo.CompanySelectedTracks (CompanyId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_CompanySelectedTracks_Email_Value' AND object_id = OBJECT_ID(N'dbo.CompanySelectedTracks'))
    CREATE UNIQUE INDEX UX_CompanySelectedTracks_Email_Value ON dbo.CompanySelectedTracks (CompanyEmail, TrackValue);
GO

PRINT 'Phase3_MultiTenant_CompanyPortal.sql completed successfully.';
GO
