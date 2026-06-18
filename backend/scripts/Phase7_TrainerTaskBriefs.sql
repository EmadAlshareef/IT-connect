-- Phase 7: Persist trainer-published task briefs in SQL.
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE ITConnectDb_v3;
GO

IF OBJECT_ID(N'dbo.TrainerTaskBriefs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrainerTaskBriefs
    (
        Id               NVARCHAR(64)   NOT NULL CONSTRAINT PK_TrainerTaskBriefs PRIMARY KEY,
        RequestedByEmail NVARCHAR(256)  NOT NULL,
        TrainerName      NVARCHAR(120)  NULL,
        SessionId        NVARCHAR(64)   NOT NULL,
        SessionTitle     NVARCHAR(300)  NULL,
        Title            NVARCHAR(300)  NOT NULL,
        Description      NVARCHAR(MAX)  NOT NULL,
        Deadline         NVARCHAR(32)   NULL,
        AttachmentName   NVARCHAR(260)  NULL,
        BranchId         NVARCHAR(64)   NULL,
        CourseId         NVARCHAR(64)   NULL,
        CourseTitle      NVARCHAR(300)  NULL,
        Status           NVARCHAR(32)   NOT NULL CONSTRAINT DF_TrainerTaskBriefs_Status DEFAULT (N'pending'),
        ReviewedAt       DATETIME2      NULL,
        PublishedAt      DATETIME2      NULL,
        CreatedAt        DATETIME2      NOT NULL,
        UpdatedAt        DATETIME2      NULL,
        LegacyLocalId    NVARCHAR(64)   NULL,
        IsDeleted        BIT            NOT NULL CONSTRAINT DF_TrainerTaskBriefs_IsDeleted DEFAULT (0)
    );

    CREATE INDEX IX_TrainerTaskBriefs_RequestedByEmail
        ON dbo.TrainerTaskBriefs (RequestedByEmail);

    CREATE INDEX IX_TrainerTaskBriefs_SessionId
        ON dbo.TrainerTaskBriefs (SessionId);

    CREATE INDEX IX_TrainerTaskBriefs_Course
        ON dbo.TrainerTaskBriefs (BranchId, CourseId, Status);
END
GO
