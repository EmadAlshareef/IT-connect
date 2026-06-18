/*
  Phase 2 — Link users to companies (database only)
  Database: ITConnectDb_v3

  - Creates dbo.UserCompanies (many-to-many: AspNetUsers <-> Companies)
  - Does NOT add CompanyId to AspNetUsers (keeps platform Admin company-agnostic)
  - Does NOT modify Controllers, APIs, or migrate existing data

  Safe to re-run (idempotent).
*/
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* Requires Phase 1 (Companies table) */
IF OBJECT_ID(N'dbo.Companies', N'U') IS NULL
BEGIN
    RAISERROR('Phase 1 required: dbo.Companies does not exist. Run Phase1_MultiTenant_Companies.sql first.', 16, 1);
    RETURN;
END
GO

/* ── UserCompanies junction table ───────────────────────────────────────── */
IF OBJECT_ID(N'dbo.UserCompanies', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserCompanies (
        UserId      NVARCHAR(450) NOT NULL,
        CompanyId   NVARCHAR(64)  NOT NULL,
        IsPrimary   BIT           NOT NULL CONSTRAINT DF_UserCompanies_IsPrimary DEFAULT (1),
        CreatedAt   DATETIME2(3)  NOT NULL CONSTRAINT DF_UserCompanies_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_UserCompanies PRIMARY KEY CLUSTERED (UserId, CompanyId),
        CONSTRAINT FK_UserCompanies_UserId
            FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE,
        CONSTRAINT FK_UserCompanies_CompanyId
            FOREIGN KEY (CompanyId) REFERENCES dbo.Companies(Id) ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserCompanies_CompanyId' AND object_id = OBJECT_ID(N'dbo.UserCompanies'))
    CREATE INDEX IX_UserCompanies_CompanyId ON dbo.UserCompanies (CompanyId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserCompanies_UserId' AND object_id = OBJECT_ID(N'dbo.UserCompanies'))
    CREATE INDEX IX_UserCompanies_UserId ON dbo.UserCompanies (UserId);
GO

/* At most one primary company per user (filtered unique index) */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_UserCompanies_PrimaryPerUser' AND object_id = OBJECT_ID(N'dbo.UserCompanies'))
    CREATE UNIQUE INDEX UX_UserCompanies_PrimaryPerUser
        ON dbo.UserCompanies (UserId)
        WHERE IsPrimary = 1;
GO

PRINT 'Phase2_MultiTenant_UserCompanies.sql completed successfully.';
GO
