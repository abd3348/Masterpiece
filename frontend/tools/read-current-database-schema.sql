-- Read-only metadata export. No CREATE, ALTER, INSERT, UPDATE or DELETE statements.
SET NOCOUNT ON;
SELECT DB_NAME() AS [database], 'dbo' AS [schema],
 JSON_QUERY((SELECT t.name,
  JSON_QUERY((SELECT c.name,
   CASE WHEN ty.name IN ('nvarchar','varchar','nchar','char','varbinary','binary') THEN ty.name+'('+CASE WHEN c.max_length=-1 THEN 'max' ELSE CONVERT(varchar(10),CASE WHEN ty.name IN ('nvarchar','nchar') THEN c.max_length/2 ELSE c.max_length END) END+')'
        WHEN ty.name IN ('decimal','numeric') THEN ty.name+'('+CONVERT(varchar(10),c.precision)+','+CONVERT(varchar(10),c.scale)+')'
        WHEN ty.name IN ('datetimeoffset','datetime2','time') THEN ty.name+'('+CONVERT(varchar(10),c.scale)+')'
        WHEN ty.name='timestamp' THEN 'rowversion' ELSE ty.name END AS [type],
   c.is_nullable AS [null], c.is_identity AS [identity], dc.name AS defaultName, dc.definition AS [default],
   CONVERT(bigint,identityColumn.seed_value) AS identitySeed, CONVERT(bigint,identityColumn.increment_value) AS identityIncrement,
   CONVERT(bit,CASE WHEN EXISTS(SELECT 1 FROM sys.index_columns ic JOIN sys.indexes ix ON ix.object_id=ic.object_id AND ix.index_id=ic.index_id WHERE ic.object_id=t.object_id AND ic.column_id=c.column_id AND ix.is_primary_key=1) THEN 1 ELSE 0 END) AS pk,
   CONVERT(bit,CASE WHEN EXISTS(SELECT 1 FROM sys.foreign_key_columns fc WHERE fc.parent_object_id=t.object_id AND fc.parent_column_id=c.column_id) THEN 1 ELSE 0 END) AS fk,
   CONVERT(bit,CASE WHEN EXISTS(SELECT 1 FROM sys.index_columns ic JOIN sys.indexes ix ON ix.object_id=ic.object_id AND ix.index_id=ic.index_id WHERE ic.object_id=t.object_id AND ic.column_id=c.column_id AND ic.key_ordinal>0 AND ix.is_unique=1 AND ix.is_primary_key=0) THEN 1 ELSE 0 END) AS uq
   FROM sys.columns c JOIN sys.types ty ON ty.user_type_id=c.user_type_id
   LEFT JOIN sys.default_constraints dc ON dc.parent_object_id=c.object_id AND dc.parent_column_id=c.column_id
   LEFT JOIN sys.identity_columns identityColumn ON identityColumn.object_id=c.object_id AND identityColumn.column_id=c.column_id
   WHERE c.object_id=t.object_id ORDER BY c.column_id FOR JSON PATH)) AS columns,
  JSON_QUERY((SELECT ix.name,ix.is_primary_key AS pk,ix.is_unique_constraint AS uq,ix.is_unique AS [unique],ix.type_desc AS [kind],ix.filter_definition AS [filter],
   JSON_QUERY((SELECT c.name,ic.is_descending_key AS [descending] FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=t.object_id AND ic.index_id=ix.index_id AND ic.key_ordinal>0 ORDER BY ic.key_ordinal FOR JSON PATH)) AS columns,
   JSON_QUERY((SELECT c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=t.object_id AND ic.index_id=ix.index_id AND ic.is_included_column=1 ORDER BY ic.index_column_id FOR JSON PATH)) AS included
   FROM sys.indexes ix WHERE ix.object_id=t.object_id AND ix.type>0 AND ix.is_hypothetical=0 ORDER BY ix.index_id FOR JSON PATH)) AS indexes,
  JSON_QUERY((SELECT ck.name,ck.definition AS expression,ck.is_disabled AS disabled,ck.is_not_trusted AS untrusted FROM sys.check_constraints ck WHERE ck.parent_object_id=t.object_id ORDER BY ck.name FOR JSON PATH)) AS checks
 FROM sys.tables t WHERE SCHEMA_NAME(t.schema_id)='dbo' AND t.name NOT IN ('__EFMigrationsHistory','sysdiagrams') ORDER BY t.name FOR JSON PATH)) AS tables,
 JSON_QUERY((SELECT fk.name,pt.name AS [from],pc.name AS [column],rt.name AS [to],rc.name AS toColumn,fk.delete_referential_action_desc AS onDelete,fk.update_referential_action_desc AS onUpdate,
  fk.is_disabled AS disabled,fk.is_not_trusted AS untrusted,fc.constraint_column_id AS ordinal
 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fc ON fc.constraint_object_id=fk.object_id
 JOIN sys.tables pt ON pt.object_id=fk.parent_object_id JOIN sys.tables rt ON rt.object_id=fk.referenced_object_id
 JOIN sys.columns pc ON pc.object_id=pt.object_id AND pc.column_id=fc.parent_column_id
 JOIN sys.columns rc ON rc.object_id=rt.object_id AND rc.column_id=fc.referenced_column_id
 WHERE SCHEMA_NAME(pt.schema_id)='dbo' AND pt.name NOT IN ('__EFMigrationsHistory','sysdiagrams') ORDER BY pt.name,fk.name,fc.constraint_column_id FOR JSON PATH)) AS relationships,
 JSON_QUERY((SELECT t.name FROM sys.tables t WHERE SCHEMA_NAME(t.schema_id)='dbo' AND t.name IN ('__EFMigrationsHistory','sysdiagrams') ORDER BY t.name FOR JSON PATH)) AS excludedTables
FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
