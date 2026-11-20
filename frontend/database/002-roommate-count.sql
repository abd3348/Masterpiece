-- Additive migration: preserve the frontend's 0 / 1 / 2 / 3+ selection.
USE [MasterDB];
GO
IF COL_LENGTH('dbo.Preferences', 'RoommatesCount') IS NULL
BEGIN
    ALTER TABLE dbo.Preferences ADD RoommatesCount varchar(3) NOT NULL
        CONSTRAINT DF_Preferences_RoommatesCount DEFAULT '0'
        CONSTRAINT CK_Preferences_RoommatesCount CHECK (RoommatesCount IN ('0','1','2','3+'));
    EXEC(N'UPDATE dbo.Preferences SET RoommatesCount = CASE WHEN Roommates = 1 THEN ''1'' ELSE ''0'' END');
END;
GO
