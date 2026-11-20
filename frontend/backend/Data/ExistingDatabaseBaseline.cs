using System.Text;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage;

namespace CampusMate.Data;

// One-time adoption of an existing SQL database. Never creates or alters application tables.
public static class ExistingDatabaseBaseline
{
    public static async Task AdoptAsync(AppDbContext db)
    {
        var migrations = db.Database.GetMigrations().ToArray();
        if (migrations.Length == 0 || !migrations[0].EndsWith("_InitialCreate"))
            throw new InvalidOperationException("InitialCreate migration was not found.");
        var applied = (await db.Database.GetAppliedMigrationsAsync()).ToArray();
        if (applied.Contains(migrations[0]))
        {
            Console.WriteLine("This database already has its initial migration recorded.");
            return;
        }
        if (applied.Length != 0)
            throw new InvalidOperationException("This database has an unrelated migration history.");

        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        await db.Database.ExecuteSqlRawAsync("DECLARE @r int; EXEC @r=sys.sp_getapplock @Resource=N'CampusMate:write', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=15000; IF @r<0 THROW 51000,'Database baseline lock unavailable',1;");
        // Adoption compares the original schema, before any later workflow migrations.
        var assembly = db.GetService<IMigrationsAssembly>();
        var initial = assembly.CreateMigration(assembly.Migrations[migrations[0]], db.Database.ProviderName!);
        var model = db.GetService<IModelRuntimeInitializer>().Initialize(initial.TargetModel, designTime: true).GetRelationalModel();
        var columns = await ReadAsync(db, """
            SELECT t.name AS [table], c.name, c.is_nullable AS nullable, c.is_identity AS [identity],
              CASE WHEN ty.name IN ('nvarchar','varchar','nchar','char','varbinary','binary')
                THEN ty.name+'('+CASE WHEN c.max_length=-1 THEN 'max' ELSE CONVERT(varchar(10),CASE WHEN ty.name IN ('nvarchar','nchar') THEN c.max_length/2 ELSE c.max_length END) END+')'
                WHEN ty.name IN ('decimal','numeric') THEN ty.name+'('+CONVERT(varchar(10),c.precision)+','+CONVERT(varchar(10),c.scale)+')'
                WHEN ty.name IN ('datetimeoffset','datetime2','time') THEN ty.name+'('+CONVERT(varchar(10),c.scale)+')'
                WHEN ty.name='timestamp' THEN 'rowversion' ELSE ty.name END AS type,
              dc.definition AS [default]
            FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id
            JOIN sys.types ty ON ty.user_type_id=c.user_type_id
            LEFT JOIN sys.default_constraints dc ON dc.parent_object_id=c.object_id AND dc.parent_column_id=c.column_id
            WHERE SCHEMA_NAME(t.schema_id)='dbo'
            """);
        var indexes = await ReadAsync(db, """
            SELECT t.name AS [table], i.name, i.is_unique AS [unique], i.filter_definition AS filter,
              STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
            FROM sys.tables t JOIN sys.indexes i ON i.object_id=t.object_id
            JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0
            JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
            WHERE SCHEMA_NAME(t.schema_id)='dbo' AND i.is_hypothetical=0
            GROUP BY t.name,i.name,i.is_unique,i.filter_definition
            """);
        var foreignKeys = await ReadAsync(db, """
            SELECT t.name AS [table], fk.name, OBJECT_NAME(fk.referenced_object_id) AS principal,
              fk.delete_referential_action_desc AS onDelete, fk.is_disabled AS disabled, fk.is_not_trusted AS untrusted,
              STRING_AGG(CONVERT(nvarchar(max),c.name),',') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS columns,
              STRING_AGG(CONVERT(nvarchar(max),pc.name),',') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS principalColumns
            FROM sys.foreign_keys fk JOIN sys.tables t ON t.object_id=fk.parent_object_id
            JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id
            JOIN sys.columns c ON c.object_id=fkc.parent_object_id AND c.column_id=fkc.parent_column_id
            JOIN sys.columns pc ON pc.object_id=fkc.referenced_object_id AND pc.column_id=fkc.referenced_column_id
            WHERE SCHEMA_NAME(t.schema_id)='dbo'
            GROUP BY t.name,fk.name,fk.referenced_object_id,fk.delete_referential_action_desc,fk.is_disabled,fk.is_not_trusted
            """);
        var checks = await ReadAsync(db, "SELECT OBJECT_NAME(parent_object_id) AS [table], name, definition, is_disabled AS disabled, is_not_trusted AS untrusted FROM sys.check_constraints");
        foreach (var table in model.Tables)
        {
            var actual = columns.Where(c => Text(c, "table") == table.Name).ToArray();
            Require(actual.Length == table.Columns.Count(), table.Name + ": column count");
            foreach (var column in table.Columns)
            {
                var c = actual.SingleOrDefault(c => Text(c, "name") == column.Name);
                Require(c is not null, table.Name + "." + column.Name + ": missing column");
                Require(Text(c!, "type").Equals(column.StoreType, StringComparison.OrdinalIgnoreCase), table.Name + "." + column.Name + ": type");
                Require(Flag(c!, "nullable") == column.IsNullable, table.Name + "." + column.Name + ": nullability");
                var identity = column.PropertyMappings.Any(m => m.Property.GetValueGenerationStrategy() == SqlServerValueGenerationStrategy.IdentityColumn);
                Require(Flag(c!, "identity") == identity, table.Name + "." + column.Name + ": identity");
                Require(Normalize(Text(c!, "default")) == Normalize(column.DefaultValueSql ?? ""), table.Name + "." + column.Name + ": default");
            }
            foreach (var key in table.UniqueConstraints)
                CheckIndex(indexes, table.Name, key.Name, key.Columns.Select(c => c.Name), true, "");
            foreach (var index in table.Indexes)
                CheckIndex(indexes, table.Name, index.Name, index.Columns.Select(c => c.Name), index.IsUnique, index.Filter ?? "");
            foreach (var fk in table.ForeignKeyConstraints)
            {
                var actualFk = foreignKeys.SingleOrDefault(c => Text(c, "table") == table.Name && Text(c, "name") == fk.Name);
                Require(actualFk is not null && Text(actualFk, "principal") == fk.PrincipalTable.Name
                    && Text(actualFk, "columns") == string.Join(',', fk.Columns.Select(c => c.Name))
                    && Text(actualFk, "principalColumns") == string.Join(',', fk.PrincipalColumns.Select(c => c.Name))
                    && Text(actualFk, "onDelete") == "NO_ACTION" && !Flag(actualFk, "disabled") && !Flag(actualFk, "untrusted"), table.Name + ": foreign key " + fk.Name);
            }
            foreach (var check in table.CheckConstraints)
            {
                var c = checks.SingleOrDefault(c => Text(c, "table") == table.Name && Text(c, "name") == check.Name);
                Require(c is not null && Normalize(Text(c, "definition")) == Normalize(check.Sql)
                    && !Flag(c, "disabled") && !Flag(c, "untrusted"), table.Name + ": check " + check.Name);
            }
        }
        var history = db.GetService<IHistoryRepository>();
        await db.Database.ExecuteSqlRawAsync(history.GetCreateIfNotExistsScript());
        var version = db.GetService<IMigrationsAssembly>().ModelSnapshot!.Model.FindAnnotation("ProductVersion")!.Value!.ToString()!;
        await db.Database.ExecuteSqlRawAsync(history.GetInsertScript(new HistoryRow(migrations[0], version)));
        await transaction.CommitAsync();
        Console.WriteLine($"Verified {model.Tables.Count()} application tables. Recorded {migrations[0]}; application data and schema were not changed.");
    }

    private static void CheckIndex(JsonObject[] indexes, string table, string name, IEnumerable<string> columns, bool unique, string filter)
    {
        var index = indexes.SingleOrDefault(c => Text(c, "table") == table && Text(c, "name") == name);
        Require(index is not null && Text(index, "columns") == string.Join(',', columns)
            && Flag(index, "unique") == unique && Normalize(Text(index, "filter")) == Normalize(filter), table + ": index/key " + name);
    }
    private static async Task<JsonObject[]> ReadAsync(AppDbContext db, string sql)
    {
        await using var command = db.Database.GetDbConnection().CreateCommand();
        command.Transaction = db.Database.CurrentTransaction!.GetDbTransaction();
        command.CommandText = sql + " FOR JSON PATH";
        await using var reader = await command.ExecuteReaderAsync();
        var json = new StringBuilder();
        while (await reader.ReadAsync()) json.Append(reader.GetString(0));
        return JsonNode.Parse(json.ToString())!.AsArray().Select(n => n!.AsObject()).ToArray();
    }
    private static string Text(JsonObject row, string name) => row[name]?.ToString() ?? "";
    private static bool Flag(JsonObject row, string name) => row[name]?.GetValue<bool>() ?? false;
    private static string Normalize(string text) => text.Trim();
    private static void Require(bool valid, string detail)
    {
        if (!valid) throw new InvalidOperationException("Baseline refused: database differs from AppDbContext (" + detail + "). No baseline was recorded.");
    }
}
