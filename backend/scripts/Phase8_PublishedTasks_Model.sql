-- Phase 8: Published tasks model — TrainerTaskBriefs is the source of truth.
-- When a trainer publishes a task, every enrolled trainee sees it (no per-student assignment).
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE ITConnectDb_v3;
GO

IF OBJECT_ID(N'dbo.TrainerTaskBriefs', N'U') IS NULL
BEGIN
    RAISERROR(N'Run Phase7_TrainerTaskBriefs.sql first.', 16, 1);
    RETURN;
END
GO

-- Helpful view for reporting / SSMS browsing
IF OBJECT_ID(N'dbo.vw_PublishedTrainingTasks', N'V') IS NOT NULL
    DROP VIEW dbo.vw_PublishedTrainingTasks;
GO

CREATE VIEW dbo.vw_PublishedTrainingTasks
AS
SELECT
    Id,
    RequestedByEmail  AS TrainerEmail,
    TrainerName,
    SessionId,
    SessionTitle,
    Title,
    Description,
    Deadline,
    AttachmentName,
    BranchId,
    CourseId,
    CourseTitle,
    Status,
    ReviewedAt,
    PublishedAt,
    CreatedAt,
    UpdatedAt,
    LegacyLocalId
FROM dbo.TrainerTaskBriefs
WHERE IsDeleted = 0
  AND Status = N'approved';
GO

-- Optional: mark legacy per-student rows as deleted (Tasks table is no longer used for publishing)
-- Uncomment only if you want to hide old demo/assigned rows from student APIs.
/*
UPDATE dbo.Tasks
SET IsDeleted = 1,
    UpdatedAtUtc = SYSUTCDATETIME()
WHERE IsDeleted = 0;
*/

-- Sample query: all published tasks for a training session
-- SELECT * FROM dbo.vw_PublishedTrainingTasks WHERE SessionId = N'your-training-id';

-- Sample query: tasks published by a trainer
-- SELECT * FROM dbo.vw_PublishedTrainingTasks WHERE TrainerEmail = N'trainer@example.com';

GO
