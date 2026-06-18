/* One-time EF ↔ v3 schema compatibility (run after FullSetup_v3.sql) */
USE ITConnectDb_v3;
GO

IF COL_LENGTH('dbo.AspNetUsers', 'TrainerLegacyId') IS NULL
    ALTER TABLE dbo.AspNetUsers ADD TrainerLegacyId NVARCHAR(64) NULL;
GO

SET QUOTED_IDENTIFIER ON;
GO
UPDATE u
SET TrainerLegacyId = t.LegacyUserId
FROM dbo.AspNetUsers u
INNER JOIN dbo.AspNetUsers t ON t.Id = u.AssignedTrainerUserId
WHERE u.TrainerLegacyId IS NULL;
GO

PRINT N'EF compatibility patch applied on ITConnectDb_v3.';
GO
