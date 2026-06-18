/* Phase 13 — Link company posts to catalog trainings for student enrollment */
USE ITConnectDb_v3;
GO

IF COL_LENGTH('dbo.CompanyPosts', 'TrainingId') IS NULL
BEGIN
    ALTER TABLE dbo.CompanyPosts ADD TrainingId NVARCHAR(64) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_CompanyPosts_TrainingId' AND object_id = OBJECT_ID(N'dbo.CompanyPosts')
)
BEGIN
    CREATE INDEX IX_CompanyPosts_TrainingId ON dbo.CompanyPosts (TrainingId) WHERE TrainingId IS NOT NULL;
END
GO

/* Backfill TrainingId from TrainingTitle + BranchId */
UPDATE p
SET p.TrainingId = t.Id
FROM dbo.CompanyPosts p
INNER JOIN dbo.Trainings t
    ON t.BranchId = p.BranchId
   AND LOWER(LTRIM(RTRIM(t.Title))) = LOWER(LTRIM(RTRIM(p.TrainingTitle)))
   AND t.IsDeleted = 0
WHERE p.TrainingId IS NULL
  AND p.TrainingTitle IS NOT NULL
  AND LTRIM(RTRIM(p.TrainingTitle)) <> ''
  AND p.IsDeleted = 0;
GO

/* Fallback: match title across branches when branch-specific match failed */
UPDATE p
SET p.TrainingId = (
    SELECT TOP (1) t.Id
    FROM dbo.Trainings t
    WHERE t.IsDeleted = 0
      AND LOWER(LTRIM(RTRIM(t.Title))) = LOWER(LTRIM(RTRIM(p.TrainingTitle)))
    ORDER BY CASE WHEN t.BranchId = p.BranchId THEN 0 ELSE 1 END, t.UpdatedAtUtc DESC
)
FROM dbo.CompanyPosts p
WHERE p.TrainingId IS NULL
  AND p.TrainingTitle IS NOT NULL
  AND LTRIM(RTRIM(p.TrainingTitle)) <> ''
  AND p.IsDeleted = 0
  AND EXISTS (
      SELECT 1 FROM dbo.Trainings t
      WHERE t.IsDeleted = 0
        AND LOWER(LTRIM(RTRIM(t.Title))) = LOWER(LTRIM(RTRIM(p.TrainingTitle)))
  );
GO
