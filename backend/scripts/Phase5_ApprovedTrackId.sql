/*
  Phase 5 — ApprovedTrackId on CompanyTrackRequests
  Database: ITConnectDb_v3

  Stores admin-approved catalog track id when a company track request is approved.
  Requires Phase 3 (CompanyTrackRequests table).

  Safe to re-run (idempotent).
*/
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.CompanyTrackRequests', N'U') IS NULL
BEGIN
    RAISERROR('Phase 3 required: dbo.CompanyTrackRequests does not exist.', 16, 1);
    RETURN;
END
GO

IF COL_LENGTH('dbo.CompanyTrackRequests', 'ApprovedTrackId') IS NULL
    ALTER TABLE dbo.CompanyTrackRequests ADD ApprovedTrackId NVARCHAR(64) NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_CompanyTrackRequests_ApprovedTrackId'
      AND object_id = OBJECT_ID(N'dbo.CompanyTrackRequests')
)
    CREATE INDEX IX_CompanyTrackRequests_ApprovedTrackId
        ON dbo.CompanyTrackRequests (ApprovedTrackId)
        WHERE ApprovedTrackId IS NOT NULL AND IsDeleted = 0;
GO

PRINT 'Phase5_ApprovedTrackId.sql completed successfully.';
GO
