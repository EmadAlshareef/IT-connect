-- Phase 10: Align dbo.Tasks columns with Create Task form fields.
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE ITConnectDb_v3;
GO

IF COL_LENGTH(N'dbo.Tasks', N'TrainingSessionId') IS NULL
    ALTER TABLE dbo.Tasks ADD TrainingSessionId NVARCHAR(64) NULL;
GO

IF COL_LENGTH(N'dbo.Tasks', N'Deadline') IS NULL
    ALTER TABLE dbo.Tasks ADD Deadline NVARCHAR(32) NULL;
GO

IF COL_LENGTH(N'dbo.Tasks', N'AttachmentDataUrl') IS NULL
    ALTER TABLE dbo.Tasks ADD AttachmentDataUrl NVARCHAR(MAX) NULL;
GO

UPDATE dbo.Tasks
SET
    TrainingSessionId = COALESCE(TrainingSessionId, CourseId, SectionId),
    Deadline = COALESCE(Deadline, CONVERT(NVARCHAR(32), DeadlineUtc, 23))
WHERE IsPublished = 1;
GO

IF OBJECT_ID(N'dbo.vw_PublishedTrainingTasks', N'V') IS NOT NULL
    DROP VIEW dbo.vw_PublishedTrainingTasks;
GO

CREATE VIEW dbo.vw_PublishedTrainingTasks
AS
SELECT
    Id,
    TrainingSessionId AS [Training Session Id],
    SessionTitle        AS [Training Session Title],
    Title               AS [Task Title],
    Description         AS [Task Description],
    Deadline            AS [Deadline],
    AttachmentName      AS [Attachment Name],
    AttachmentDataUrl   AS [Attachment Data],
    TrainerEmail,
    TrainerName,
    BranchId,
    CourseId,
    CourseTitle,
    CASE WHEN IsPublished = 1 THEN N'approved' ELSE N'pending' END AS Status,
    PublishedAtUtc      AS PublishedAt,
    CreatedAtUtc          AS CreatedAt,
    UpdatedAtUtc          AS UpdatedAt,
    LegacyLocalId
FROM dbo.Tasks
WHERE IsDeleted = 0
  AND IsPublished = 1
  AND StudentUserId IS NULL;
GO
