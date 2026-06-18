-- Phase 6: Allow uploaded company logos (base64 data URLs) in LogoUrl.
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE ITConnectDb_v3;
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns c
    INNER JOIN sys.tables t ON t.object_id = c.object_id
    WHERE t.name = N'Companies' AND c.name = N'LogoUrl'
)
BEGIN
    ALTER TABLE dbo.Companies
        ALTER COLUMN LogoUrl NVARCHAR(MAX) NULL;
END
GO
