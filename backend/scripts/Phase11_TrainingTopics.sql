-- Phase 11: Persist trainer topic documentation in SQL.
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE ITConnectDb_v3;
GO

IF OBJECT_ID(N'dbo.TrainingTopics', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrainingTopics
    (
        Id                     NVARCHAR(64)   NOT NULL CONSTRAINT PK_TrainingTopics PRIMARY KEY,
        TrainerEmail           NVARCHAR(256)  NOT NULL,
        TrainingSessionId      NVARCHAR(64)   NOT NULL,
        TrainingTitle          NVARCHAR(300)  NULL,
        Title                  NVARCHAR(300)  NOT NULL,
        Explanation            NVARCHAR(MAX)  NOT NULL,
        Status                 NVARCHAR(32)   NOT NULL CONSTRAINT DF_TrainingTopics_Status DEFAULT (N'draft'),
        ContentKey             NVARCHAR(200)  NULL,
        VideoUrl               NVARCHAR(MAX)  NULL,
        VideoCaption           NVARCHAR(500)  NULL,
        VideoSource            NVARCHAR(64)   NULL,
        VideoFileName          NVARCHAR(260)  NULL,
        VideoFileSize          INT            NULL,
        VideoAllowDownload     BIT            NOT NULL CONSTRAINT DF_TrainingTopics_VideoAllowDownload DEFAULT (1),
        SectionsJson           NVARCHAR(MAX)  NULL,
        AttachmentsJson        NVARCHAR(MAX)  NULL,
        EnrolledStudentIdsJson NVARCHAR(MAX)  NULL,
        EnrolledCount          INT            NOT NULL CONSTRAINT DF_TrainingTopics_EnrolledCount DEFAULT (0),
        BranchId               NVARCHAR(64)   NULL,
        CourseId               NVARCHAR(64)   NULL,
        PublishedAt            DATETIME2      NULL,
        CreatedAt              DATETIME2      NOT NULL,
        UpdatedAt              DATETIME2      NULL,
        LegacyLocalId          NVARCHAR(64)   NULL,
        IsDeleted              BIT            NOT NULL CONSTRAINT DF_TrainingTopics_IsDeleted DEFAULT (0)
    );

    CREATE INDEX IX_TrainingTopics_TrainerEmail ON dbo.TrainingTopics (TrainerEmail);
    CREATE INDEX IX_TrainingTopics_TrainingSessionId ON dbo.TrainingTopics (TrainingSessionId);
    CREATE INDEX IX_TrainingTopics_Status ON dbo.TrainingTopics (Status, TrainingSessionId);
END
GO

IF OBJECT_ID(N'dbo.vw_TrainingTopics', N'V') IS NOT NULL
    DROP VIEW dbo.vw_TrainingTopics;
GO

CREATE VIEW dbo.vw_TrainingTopics
AS
SELECT
    Id,
    TrainerEmail,
    TrainingSessionId AS [Training Session Id],
    TrainingTitle     AS [Training Session Title],
    Title             AS [Topic Title],
    Explanation,
    Status,
    VideoCaption,
    VideoFileName,
    EnrolledCount,
    PublishedAt,
    CreatedAt,
    UpdatedAt
FROM dbo.TrainingTopics
WHERE IsDeleted = 0;
GO
