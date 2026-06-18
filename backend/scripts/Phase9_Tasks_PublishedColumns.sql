-- Phase 9: Store published trainer tasks in dbo.Tasks (editable in SSMS).
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE ITConnectDb_v3;
GO

-- Allow shared published tasks (no single student owner)
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Tasks') AND name = N'StudentUserId' AND is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.Tasks ALTER COLUMN StudentUserId NVARCHAR(450) NULL;
END
GO

IF COL_LENGTH(N'dbo.Tasks', N'IsPublished') IS NULL
    ALTER TABLE dbo.Tasks ADD IsPublished BIT NOT NULL CONSTRAINT DF_Tasks_IsPublished DEFAULT (0);
GO

IF COL_LENGTH(N'dbo.Tasks', N'TrainerEmail') IS NULL
    ALTER TABLE dbo.Tasks ADD TrainerEmail NVARCHAR(256) NULL;
GO

IF COL_LENGTH(N'dbo.Tasks', N'TrainerName') IS NULL
    ALTER TABLE dbo.Tasks ADD TrainerName NVARCHAR(120) NULL;
GO

IF COL_LENGTH(N'dbo.Tasks', N'SessionTitle') IS NULL
    ALTER TABLE dbo.Tasks ADD SessionTitle NVARCHAR(300) NULL;
GO

IF COL_LENGTH(N'dbo.Tasks', N'AttachmentName') IS NULL
    ALTER TABLE dbo.Tasks ADD AttachmentName NVARCHAR(260) NULL;
GO

IF COL_LENGTH(N'dbo.Tasks', N'BranchId') IS NULL
    ALTER TABLE dbo.Tasks ADD BranchId NVARCHAR(64) NULL;
GO

IF COL_LENGTH(N'dbo.Tasks', N'CourseId') IS NULL
    ALTER TABLE dbo.Tasks ADD CourseId NVARCHAR(64) NULL;
GO

IF COL_LENGTH(N'dbo.Tasks', N'CourseTitle') IS NULL
    ALTER TABLE dbo.Tasks ADD CourseTitle NVARCHAR(300) NULL;
GO

IF COL_LENGTH(N'dbo.Tasks', N'PublishedAtUtc') IS NULL
    ALTER TABLE dbo.Tasks ADD PublishedAtUtc DATETIME2 NULL;
GO

IF COL_LENGTH(N'dbo.Tasks', N'LegacyLocalId') IS NULL
    ALTER TABLE dbo.Tasks ADD LegacyLocalId NVARCHAR(64) NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Tasks_Published_Section' AND object_id = OBJECT_ID(N'dbo.Tasks')
)
    CREATE INDEX IX_Tasks_Published_Section ON dbo.Tasks (IsPublished, SectionId) WHERE IsDeleted = 0;
GO

-- Migrate existing TrainerTaskBriefs rows into Tasks (one shared row per brief)
INSERT INTO dbo.Tasks (
    Id, StudentUserId, SectionId, Title, Description, DeadlineUtc, StatusId,
    CreatedAtUtc, UpdatedAtUtc, IsDeleted, IsPublished,
    TrainerEmail, TrainerName, SessionTitle, AttachmentName,
    BranchId, CourseId, CourseTitle, PublishedAtUtc, LegacyLocalId
)
SELECT
    CASE WHEN LEFT(b.Id, 5) = N'ttb-' THEN CONCAT(N'task-', SUBSTRING(b.Id, 5, 32)) ELSE b.Id END,
    NULL,
    CASE WHEN EXISTS (SELECT 1 FROM dbo.TrainingSections AS ts WHERE ts.Id = b.SessionId) THEN b.SessionId ELSE NULL END,
    b.Title,
    b.Description,
    COALESCE(TRY_CONVERT(DATETIME2, b.Deadline), b.CreatedAt),
    9,
    b.CreatedAt,
    COALESCE(b.UpdatedAt, b.CreatedAt),
    b.IsDeleted,
    CASE WHEN b.Status = N'approved' THEN 1 ELSE 0 END,
    b.RequestedByEmail,
    b.TrainerName,
    b.SessionTitle,
    b.AttachmentName,
    b.BranchId,
    COALESCE(NULLIF(b.CourseId, N''), b.SessionId),
    b.CourseTitle,
    b.PublishedAt,
    b.LegacyLocalId
FROM dbo.TrainerTaskBriefs AS b
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Tasks AS t
    WHERE t.Id = CASE WHEN LEFT(b.Id, 5) = N'ttb-' THEN CONCAT(N'task-', SUBSTRING(b.Id, 5, 32)) ELSE b.Id END
);
GO

IF OBJECT_ID(N'dbo.vw_PublishedTrainingTasks', N'V') IS NOT NULL
    DROP VIEW dbo.vw_PublishedTrainingTasks;
GO

CREATE VIEW dbo.vw_PublishedTrainingTasks
AS
SELECT
    Id,
    TrainerEmail,
    TrainerName,
    SectionId       AS SessionId,
    SessionTitle,
    Title,
    Description,
    CONVERT(NVARCHAR(32), DeadlineUtc, 23) AS Deadline,
    AttachmentName,
    BranchId,
    CourseId,
    CourseTitle,
    CASE WHEN IsPublished = 1 THEN N'approved' ELSE N'pending' END AS Status,
    PublishedAtUtc  AS PublishedAt,
    CreatedAtUtc    AS CreatedAt,
    UpdatedAtUtc    AS UpdatedAt,
    LegacyLocalId
FROM dbo.Tasks
WHERE IsDeleted = 0
  AND IsPublished = 1
  AND StudentUserId IS NULL;
GO

-- Sample: edit a published task directly in SQL
-- UPDATE dbo.Tasks
-- SET Title = N'New title', Description = N'Updated text', DeadlineUtc = '2026-07-01', UpdatedAtUtc = SYSUTCDATETIME()
-- WHERE Id = N'task-d38e53d01' AND IsPublished = 1;

GO
