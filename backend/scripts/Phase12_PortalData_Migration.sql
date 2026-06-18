-- Phase 12: Move submissions, feedback, evaluations, notifications, topic media to SQL.
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE ITConnectDb_v3;
GO

-- TaskSubmissions: review + course context
IF COL_LENGTH(N'dbo.TaskSubmissions', N'TaskTitle') IS NULL
    ALTER TABLE dbo.TaskSubmissions ADD TaskTitle NVARCHAR(300) NULL;
GO
IF COL_LENGTH(N'dbo.TaskSubmissions', N'BranchId') IS NULL
    ALTER TABLE dbo.TaskSubmissions ADD BranchId NVARCHAR(64) NULL;
GO
IF COL_LENGTH(N'dbo.TaskSubmissions', N'CourseId') IS NULL
    ALTER TABLE dbo.TaskSubmissions ADD CourseId NVARCHAR(64) NULL;
GO
IF COL_LENGTH(N'dbo.TaskSubmissions', N'Status') IS NULL
    ALTER TABLE dbo.TaskSubmissions ADD Status NVARCHAR(64) NOT NULL CONSTRAINT DF_TaskSubmissions_Status DEFAULT (N'Pending Evaluation');
GO
IF COL_LENGTH(N'dbo.TaskSubmissions', N'Grade') IS NULL
    ALTER TABLE dbo.TaskSubmissions ADD Grade NVARCHAR(16) NULL;
GO
IF COL_LENGTH(N'dbo.TaskSubmissions', N'EvaluationFeedback') IS NULL
    ALTER TABLE dbo.TaskSubmissions ADD EvaluationFeedback NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH(N'dbo.TaskSubmissions', N'TrainerName') IS NULL
    ALTER TABLE dbo.TaskSubmissions ADD TrainerName NVARCHAR(120) NULL;
GO
IF COL_LENGTH(N'dbo.TaskSubmissions', N'ReviewedByUserId') IS NULL
    ALTER TABLE dbo.TaskSubmissions ADD ReviewedByUserId NVARCHAR(450) NULL;
GO
IF COL_LENGTH(N'dbo.TaskSubmissions', N'ReviewedAtUtc') IS NULL
    ALTER TABLE dbo.TaskSubmissions ADD ReviewedAtUtc DATETIME2 NULL;
GO
IF COL_LENGTH(N'dbo.TaskSubmissions', N'LegacyLocalId') IS NULL
    ALTER TABLE dbo.TaskSubmissions ADD LegacyLocalId NVARCHAR(64) NULL;
GO

-- TrainerFeedback: link to submission + course
IF COL_LENGTH(N'dbo.TrainerFeedback', N'SubmissionId') IS NULL
    ALTER TABLE dbo.TrainerFeedback ADD SubmissionId NVARCHAR(64) NULL;
GO
IF COL_LENGTH(N'dbo.TrainerFeedback', N'BranchId') IS NULL
    ALTER TABLE dbo.TrainerFeedback ADD BranchId NVARCHAR(64) NULL;
GO
IF COL_LENGTH(N'dbo.TrainerFeedback', N'CourseId') IS NULL
    ALTER TABLE dbo.TrainerFeedback ADD CourseId NVARCHAR(64) NULL;
GO
IF COL_LENGTH(N'dbo.TrainerFeedback', N'LegacyLocalId') IS NULL
    ALTER TABLE dbo.TrainerFeedback ADD LegacyLocalId NVARCHAR(64) NULL;
GO

-- Evaluation items: grade + feedback
IF COL_LENGTH(N'dbo.EvaluationTaskItems', N'Grade') IS NULL
    ALTER TABLE dbo.EvaluationTaskItems ADD Grade NVARCHAR(16) NULL;
GO
IF COL_LENGTH(N'dbo.EvaluationTaskItems', N'Feedback') IS NULL
    ALTER TABLE dbo.EvaluationTaskItems ADD Feedback NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH(N'dbo.EvaluationTaskItems', N'LegacyLocalId') IS NULL
    ALTER TABLE dbo.EvaluationTaskItems ADD LegacyLocalId NVARCHAR(64) NULL;
GO

-- Portal notifications: submission/topic/student targets
IF COL_LENGTH(N'dbo.PortalNotifications', N'SubmissionId') IS NULL
    ALTER TABLE dbo.PortalNotifications ADD SubmissionId NVARCHAR(64) NULL;
GO
IF COL_LENGTH(N'dbo.PortalNotifications', N'TopicId') IS NULL
    ALTER TABLE dbo.PortalNotifications ADD TopicId NVARCHAR(64) NULL;
GO
IF COL_LENGTH(N'dbo.PortalNotifications', N'StudentLegacyId') IS NULL
    ALTER TABLE dbo.PortalNotifications ADD StudentLegacyId NVARCHAR(64) NULL;
GO
IF COL_LENGTH(N'dbo.PortalNotifications', N'TargetPath') IS NULL
    ALTER TABLE dbo.PortalNotifications ADD TargetPath NVARCHAR(260) NULL;
GO
IF COL_LENGTH(N'dbo.PortalNotifications', N'LegacyLocalId') IS NULL
    ALTER TABLE dbo.PortalNotifications ADD LegacyLocalId NVARCHAR(64) NULL;
GO

-- Training topics: server-hosted large media
IF COL_LENGTH(N'dbo.TrainingTopics', N'VideoBlobUrl') IS NULL
    ALTER TABLE dbo.TrainingTopics ADD VideoBlobUrl NVARCHAR(500) NULL;
GO
