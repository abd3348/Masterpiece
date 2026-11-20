// Run directly with Node. No dependencies or build step are required.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'docs/database');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(folder, 'database-data.js'), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(path.join(folder, 'database.js'), 'utf8'), context);
const model = JSON.parse(JSON.stringify(context.DatabaseDesign));
const tables = new Map(model.tables.map(table => [table.name, table]));
const groupIds = new Set(model.groups.map(group => group.id));
const allowedCardinality = new Set(['one', 'zeroOne', 'many', 'zeroMany']);
assert.deepEqual(fs.readdirSync(folder).sort(), ['database-data.js', 'database.css', 'database.html', 'database.js'].sort());
assert.equal(tables.size, model.tables.length, 'Duplicate table names');
assert.equal(groupIds.size, model.groups.length, 'Duplicate groups');
assert(tables.has(model.project.hubTable), 'Missing hub table');
const layout = model.LAYOUT.flat();
assert.equal(layout.length, tables.size, 'LAYOUT must include every table once');
assert.equal(new Set(layout).size, layout.length, 'Repeated LAYOUT table');
for (const name of layout) assert(tables.has(name), 'Unknown LAYOUT table: ' + name);
const relationshipIds = new Set();
for (const table of model.tables) {
    assert(groupIds.has(table.group), 'Unknown group for ' + table.name);
    assert(table.description.trim(), 'Missing description');
    const columns = new Map(table.columns.map(column => [column.name, column]));
    assert.equal(columns.size, table.columns.length, 'Duplicate column in ' + table.name);
    assert(table.primaryKey.length, 'Missing primary key: ' + table.name);
    assert.deepEqual(table.columns.filter(column => column.pk).map(column => column.name), table.primaryKey);
    for (const column of table.columns) {
        assert(column.name && column.type, 'Missing column name or type');
        for (const flag of ['pk', 'fk', 'uq', 'null']) assert.equal(typeof column[flag], 'boolean', table.name + '.' + column.name + ' missing ' + flag);
        if (column.pk) assert(!column.null, 'Primary key cannot be nullable');
        if (column.identity) assert(column.name.toLowerCase() === 'id' && /^(int|bigint|smallint|tinyint)$/i.test(column.type), 'Identity only applies to an integer column named id');
        const links = model.relationships.filter(link => link.from === table.name && link.column === column.name);
        assert.equal(links.length, column.fk ? 1 : 0, 'Every FK needs exactly one relationship: ' + table.name + '.' + column.name);
    }
    for (const unique of table.uniqueConstraints) for (const name of unique.columns) assert(columns.has(name), 'Unknown unique column');
    for (const index of table.indexes) for (const name of index.columns) assert(columns.has(name), 'Unknown index column');
    for (const check of table.checks) assert(check.expression && check.description, 'Check requires its expression and plain-language explanation');
    for (const mapping of table.statusMappings || []) {
        const column = columns.get(mapping.column);
        assert(column && column.enum, 'Status mapping must refer to an enum');
        assert.deepEqual(Object.keys(mapping.values).sort(), column.enum.map(String).sort(), 'Status mapping must cover exactly the stored values');
    }
}
for (const link of model.relationships) {
    assert(!relationshipIds.has(link.id), 'Duplicate relationship ID'); relationshipIds.add(link.id);
    assert(allowedCardinality.has(link.fromCardinality) && allowedCardinality.has(link.toCardinality), 'Invalid cardinality');
    const from = tables.get(link.from), to = tables.get(link.to);
    assert(from && to, 'Unknown relationship table');
    const column = from.columns.find(column => column.name === link.column);
    assert(column?.fk, 'Relationship must start at a foreign key');
    assert(to.primaryKey.includes(link.toColumn), 'Relationship must point to a primary-key row');
    assert.equal(link.toCardinality, column.null ? 'zeroOne' : 'one', 'FK optionality must match cardinality');
    assert(link.label.trim(), 'Missing relationship verb');
}
const order = Array.from(context.DatabaseDocs.topologicalOrder(), table => table.name);
for (const link of model.relationships) assert(order.indexOf(link.to) < order.indexOf(link.from), 'SQL dependency order is wrong');
const sql = context.DatabaseDocs.generateSQL();
assert.equal((sql.match(/CREATE TABLE /g) || []).length, tables.size);
assert.equal((sql.match(/ FOREIGN KEY /g) || []).length, model.relationships.length);
for (const table of model.tables) {
    const body = sql.match(new RegExp('CREATE TABLE \\[dbo\\]\\.\\[' + table.name + '\\] \\(([\\s\\S]*?)\\n\\);'))[1];
    for (const column of table.columns) {
        assert(body.includes('[' + column.name + '] ' + column.type), 'SQL missing column');
        if (column.default !== undefined) assert(body.includes('DEFAULT ' + column.default), 'SQL missing default');
    }
    for (const index of table.indexes) assert(sql.includes('INDEX [' + index.name + ']'), 'SQL missing index');
}
for (const line of sql.split('\n').filter(line => line.includes(' IDENTITY('))) assert(/^\s+\[id\] /i.test(line), 'An identifying FK was incorrectly made an identity');
const source = JSON.parse(fs.readFileSync(path.join(__dirname,'artifacts/database-docs/current-schema.json'),'utf8'));
assert.equal(model.project.database,source.database);
assert.deepEqual(model.tables.map(t=>t.name).sort(),source.tables.map(t=>t.name).sort(),'Documentation must match current SQL Server tables');
for(const actual of source.tables){
    const table=tables.get(actual.name);
    assert.equal(table.columns.length,actual.columns.length);
    actual.columns.forEach((column,i)=>{
        const documented=table.columns[i];
        for(const key of ['name','type','pk','fk','uq','null','default','defaultName'])assert.deepEqual(documented[key],column[key],actual.name+'.'+column.name+' '+key);
        assert.equal(!!documented.identity,column.identity);
        if(column.identity){assert.equal(documented.identitySeed,column.identitySeed);assert.equal(documented.identityIncrement,column.identityIncrement);}
    });
    const primary=actual.indexes.find(ix=>ix.pk);assert.equal(table.primaryKeyName,primary.name);assert.deepEqual(table.primaryKey,primary.columns.map(c=>c.name));
    assert.equal(table.primaryKeyClustered,primary.kind==='CLUSTERED');
    assert.deepEqual(table.checks.map(c=>[c.name,c.expression]),(actual.checks||[]).map(c=>[c.name,c.expression]),actual.name+' CHECK constraints');
    for(const check of table.checks)assert(sql.includes('CONSTRAINT ['+check.name+'] CHECK ('+check.expression+')'),'SQL must retain the actual CHECK expression');
    for(const documented of [...table.uniqueConstraints,...table.indexes]){
        const index=actual.indexes.find(ix=>ix.name===documented.name);assert(index,'Unknown index: '+documented.name);
        assert.deepEqual(documented.columns,index.columns.map(c=>c.name));assert.deepEqual(documented.descending,index.columns.map(c=>c.descending));
        assert.equal(documented.clustered,index.kind==='CLUSTERED');assert.equal(documented.where,index.filter);
    }
    assert.equal(table.uniqueConstraints.length,actual.indexes.filter(ix=>ix.uq).length);
    assert.equal(table.indexes.length,actual.indexes.filter(ix=>!ix.pk&&!ix.uq).length);
}
const sourceRefs=source.relationships.map(link=>link.from+'.'+link.column+'->'+link.to+'.'+link.toColumn);
assert.deepEqual(model.relationships.map(link=>link.from+'.'+link.column+'->'+link.to+'.'+link.toColumn).sort(),sourceRefs.sort(),'Documentation must match every current SQL Server FK');
for(const link of model.relationships){const actual=source.relationships.find(r=>r.name===link.name);assert(actual);assert.equal(link.onDelete,actual.onDelete);assert.equal(link.onUpdate,actual.onUpdate);}
assert.equal((sql.match(/\bCHECK\s*\(/g)||[]).length,source.tables.reduce((sum,t)=>sum+(t.checks||[]).length,0),'SQL lost or duplicated a CHECK constraint');
assert(!/\bCREATE\s+DATABASE\b|\bDROP\s+TABLE\b|\bALTER\s+TABLE\b/i.test(sql),'Documentation must not create a database or alter existing application tables');
assert(sql.includes('IF EXISTS (SELECT 1 FROM sys.tables'),'Generated DDL needs the existing-table guard');
assert.equal(sql,fs.readFileSync(path.join(root,'database/MasterDB-current-schema.sql'),'utf8'),'Shared SQL file must match the single-source generator');
const html = fs.readFileSync(path.join(folder, 'database.html'), 'utf8');
assert(!/<style\b/i.test(html), 'Inline style block');
assert(!/\sstyle\s*=/i.test(html), 'Inline style attribute');
assert(!/\son\w+\s*=/i.test(html), 'Inline event handler');
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) assert(/\bsrc=/.test(match[1]) && !match[2].trim(), 'Inline script');
const stats = { tables: tables.size, columns: model.tables.reduce((sum, table) => sum + table.columns.length, 0), relationships: model.relationships.length, checks: (sql.match(/\bCHECK\s*\(/g) || []).length, indexes: model.tables.reduce((sum, table) => sum + table.indexes.length, 0), layoutColumns: model.LAYOUT.length };
if (require.main === module) console.log('PASS database-data.js validation\n' + JSON.stringify(stats, null, 2));
module.exports = { model, sql, stats };
