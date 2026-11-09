/* Buildless database documentation. All schema content comes from DatabaseDesign. */
(() => {
    'use strict';
    const data = globalThis.DatabaseDesign;
    const tables = new Map(data.tables.map(table => [table.name, table]));
    const quote = name => '[' + name.replaceAll(']', ']]') + ']';
    const qualified = name => quote(data.project.schema) + '.' + quote(name);

    function topologicalOrder(model = data) {
        const ordered = [], visited = new Set(), visiting = new Set();
        const available = new Map(model.tables.map(table => [table.name, table]));
        function visit(name) {
            if (visited.has(name)) return;
            if (!available.has(name)) throw Error('Unknown referenced table: ' + name);
            if (visiting.has(name)) throw Error('Circular reference involving ' + name);
            visiting.add(name);
            model.relationships.filter(link => link.from === name).forEach(link => visit(link.to));
            visiting.delete(name);
            visited.add(name);
            ordered.push(available.get(name));
        }
        model.tables.forEach(table => visit(table.name));
        return ordered;
    }

    function generateSQL() {
        const keyColumns = (columns, descending = []) => columns.map((name, i) => quote(name) + (descending[i] ? ' DESC' : ' ASC')).join(', ');
        const lines = [
            '-- ' + data.project.name + ' | ' + data.project.database + ' | ' + data.project.engine,
            '-- Current application schema captured ' + data.project.snapshotDate + '; generated from database-data.js.',
            '-- Presentation / initial-schema script. No database is created and no existing records are changed.',
            '-- Internal SQL Server diagrams and EF migration history are excluded.',
            '-- Existing application tables cause an error before any DDL is executed.',
            'USE ' + quote(data.project.database) + ';', 'GO',
            'SET ANSI_NULLS ON;', 'SET QUOTED_IDENTIFIER ON;', 'SET ANSI_PADDING ON;',
            'SET ANSI_WARNINGS ON;', 'SET CONCAT_NULL_YIELDS_NULL ON;', 'SET ARITHABORT ON;', 'SET NUMERIC_ROUNDABORT OFF;', 'SET XACT_ABORT ON;', '',
            'BEGIN TRY', 'BEGIN TRANSACTION;',
            'IF EXISTS (SELECT 1 FROM sys.tables WHERE SCHEMA_NAME(schema_id) = N\'' + data.project.schema.replaceAll("'", "''") + '\' AND name IN (' + data.tables.map(t=>"N'"+t.name.replaceAll("'","''")+"'").join(', ') + '))',
            "    THROW 51000, 'Application tables already exist. This documentation DDL is not an upgrade script.', 1;", ''
        ];
        topologicalOrder().forEach(table => {
            lines.push('-- ' + table.description, 'CREATE TABLE ' + qualified(table.name) + ' (');
            const definitions = table.columns.map(column => {
                // An identifying FK such as Preferences.UserId is NOT an identity.
                const identity = column.identity === true && column.name.toLowerCase() === 'id' ? ' IDENTITY(' + (column.identitySeed ?? 1) + ',' + (column.identityIncrement ?? 1) + ')' : '';
                return '    ' + quote(column.name) + ' ' + column.type + identity + (column.null ? ' NULL' : ' NOT NULL') +
                    (column.default !== undefined ? (column.defaultName ? ' CONSTRAINT ' + quote(column.defaultName) : '') + ' DEFAULT ' + column.default : '');
            });
            definitions.push('    CONSTRAINT ' + quote(table.primaryKeyName) + ' PRIMARY KEY ' + (table.primaryKeyClustered ? 'CLUSTERED' : 'NONCLUSTERED') + ' (' + keyColumns(table.primaryKey,table.primaryKeyDescending) + ')');
            table.uniqueConstraints.forEach(unique => definitions.push('    CONSTRAINT ' + quote(unique.name) + ' UNIQUE ' + (unique.clustered ? 'CLUSTERED' : 'NONCLUSTERED') + ' (' + keyColumns(unique.columns,unique.descending) + ')'));
            // Keep the actual CHECK expressions and names, including enum checks, exactly once.
            table.checks.forEach(check => definitions.push('    CONSTRAINT ' + quote(check.name) + ' CHECK (' + check.expression + ')'));
            data.relationships.filter(link => link.from === table.name).forEach(link => {
                definitions.push('    CONSTRAINT ' + quote(link.name) + ' FOREIGN KEY (' + quote(link.column) + ') REFERENCES ' + qualified(link.to) + ' (' + quote(link.toColumn) + ') ON DELETE ' + link.onDelete.replaceAll('_',' ') + ' ON UPDATE ' + link.onUpdate.replaceAll('_',' '));
            });
            lines.push(definitions.join(',\n'), ');', '');
            table.indexes.forEach(index => {
                lines.push('CREATE ' + (index.unique ? 'UNIQUE ' : '') + (index.clustered ? 'CLUSTERED ' : 'NONCLUSTERED ') + 'INDEX ' + quote(index.name) + ' ON ' + qualified(table.name) + ' (' + keyColumns(index.columns,index.descending) + ')' + (index.included?.length ? ' INCLUDE (' + index.included.map(quote).join(', ') + ')' : '') + (index.where ? ' WHERE ' + index.where : '') + ';');
            });
            if (table.indexes.length) lines.push('');
        });
        lines.push('COMMIT TRANSACTION;', 'END TRY', 'BEGIN CATCH', '    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;', '    THROW;', 'END CATCH;', 'GO');
        return lines.join('\n').trimEnd() + '\n';
    }

    // The pure functions can also be used by the small Node validation script.
    globalThis.DatabaseDocs = Object.freeze({ generateSQL, topologicalOrder });
    if (typeof document === 'undefined') return;

    function element(tag, attributes = {}, children = []) {
        const result = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            if (value !== false && value !== null && value !== undefined) result.setAttribute(key, value === true ? '' : String(value));
        });
        for (const child of [children].flat(Infinity)) if (child !== null && child !== undefined) result.append(child instanceof Node ? child : String(child));
        return result;
    }
    function svgElement(tag, attributes = {}, text) {
        const result = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attributes).forEach(([key, value]) => result.setAttribute(key, String(value)));
        if (text !== undefined) result.textContent = text;
        return result;
    }
    const byId = id => document.getElementById(id);
    const outgoing = name => data.relationships.filter(link => link.from === name);
    const incoming = name => data.relationships.filter(link => link.to === name);
    const uniqueNames = list => [...new Set(list)];
    const columnTotal = data.tables.reduce((sum, table) => sum + table.columns.length, 0);
    const plural = (count, noun) => count + ' ' + noun + (count === 1 ? '' : 's');
    const humanName = text => text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

    byId('project-name').textContent = data.project.name;
    document.title = data.project.name + ' · Database design';
    byId('project-description').textContent = data.project.description;
    byId('database-badge').textContent = data.project.engine + ' · ' + data.project.database;
    byId('stores').append(...data.project.stores.map(store => element('span', { class: 'store-tag' }, store)));
    byId('metrics').append(...[[data.tables.length, 'Tables'], [columnTotal, 'Columns'], [data.relationships.length, 'Relationships']].map(([count, label]) => element('div', { class: 'metric' }, [element('strong', {}, count), element('span', {}, label)])));
    byId('footer-context').textContent = data.project.name + ' / ' + data.project.database + ' / ' + data.project.schema + ' schema';
    byId('schema-provenance').textContent = 'Current ' + data.project.database + ' application schema · Verified ' + data.project.snapshotDate + '. ' + data.project.excludedTables.join(' and ') + ' are infrastructure tables and are excluded. No account records or private data are included.';

    const tabNames = ['er', 'schema', 'tables', 'sql', 'rules'];
    const diagrams = new Map();
    let activeTab = 'er';
    function selectTab(name, focus = false) {
        activeTab = name;
        tabNames.forEach(key => {
            const selected = key === name;
            byId('tab-' + key).setAttribute('aria-selected', String(selected));
            byId('tab-' + key).tabIndex = selected ? 0 : -1;
            byId('panel-' + key).toggleAttribute('hidden', !selected);
        });
        if (name === 'er' || name === 'schema') {
            if (!diagrams.has(name)) diagrams.set(name, buildDiagram(name));
            const diagram = diagrams.get(name);
            if (!diagram.manualZoom) requestAnimationFrame(() => diagram.fit());
        }
        if (focus) byId('tab-' + name).focus();
    }
    tabNames.forEach((name, index) => {
        const button = byId('tab-' + name);
        button.addEventListener('click', () => selectTab(name));
        button.addEventListener('keydown', event => {
            let target;
            if (event.key === 'ArrowRight') target = (index + 1) % tabNames.length;
            if (event.key === 'ArrowLeft') target = (index + tabNames.length - 1) % tabNames.length;
            if (event.key === 'Home') target = 0;
            if (event.key === 'End') target = tabNames.length - 1;
            if (target !== undefined) { event.preventDefault(); selectTab(tabNames[target], true); }
        });
    });
    document.addEventListener('click', event => {
        const anchor = event.target.closest('a[data-table-link]');
        if (!anchor) return;
        event.preventDefault();
        const name = anchor.dataset.tableLink;
        selectTab('tables');
        requestAnimationFrame(() => {
            byId('table-' + name).scrollIntoView({ block: 'start' });
            byId('table-' + name).focus({ preventScroll: true });
            history.replaceState(null, '', '#table-' + name);
        });
    });
    const tableLink = (name, label = name) => element('a', { href: '#table-' + name, 'data-table-link': name }, label);
    const chips = column => element('span', { class: 'chips' }, ['pk', 'fk', 'uq'].filter(flag => column[flag]).map(flag => element('span', { class: 'chip', title: { pk: 'Primary key', fk: 'Foreign key', uq: 'Unique constraint' }[flag] }, flag.toUpperCase())));

    function checkDescription(check) {
        if (check.description) return check.description;
        const expression = check.expression;
        if (/^ISJSON\((\w+)\) = 1$/.test(expression)) return humanName(RegExp.$1) + ' must contain valid JSON.';
        let match = expression.match(/^(\w+) IS NULL OR ISJSON\(\1\) = 1$/);
        if (match) return humanName(match[1]) + ' may be empty; otherwise it must contain valid JSON.';
        match = expression.match(/^(\w+) BETWEEN (\d+) AND (\d+)$/);
        if (match) return humanName(match[1]) + ' must be between ' + match[2] + ' and ' + match[3] + '.';
        match = expression.match(/^(\w+) (>=|>|<>) (\w+)$/);
        if (match) return humanName(match[1]) + ' must be ' + { '>=': 'at least ', '>': 'greater than ', '<>': 'different from ' }[match[2]] + (/^\d+$/.test(match[3]) ? match[3] : humanName(match[3])) + '.';
        return 'The stored values must satisfy: ' + expression + '.';
    }
    function indexDescription(table, index) {
        if (index.description) return index.description;
        return (index.unique ? 'No duplicate ' : 'Lookups are indexed by ') + index.columns.join(' + ') + (index.where ? ' where ' + index.where : '') + (index.unique ? ' combinations are allowed.' : '.');
    }
    function enforcedRules(table) {
        const rules = [];
        if (table.primaryKey.length > 1) rules.push('The combination of ' + table.primaryKey.join(' + ') + ' identifies one record and cannot repeat.');
        else if (table.primaryKey[0] !== 'Id') rules.push('Only one record can use a given ' + table.primaryKey[0] + '.');
        table.uniqueConstraints.forEach(unique => rules.push('Two records cannot share the same ' + unique.columns.join(' + ') + '.'));
        table.checks.forEach(check => rules.push(checkDescription(check)));
        table.indexes.filter(index => index.unique).forEach(index => rules.push(indexDescription(table, index)));
        if (!rules.length) rules.push('Every record has a non-empty, unique primary key.');
        const links = outgoing(table.name);
        if (links.length) rules.push('Every non-empty foreign key must match an existing referenced record.');
        return rules;
    }

    function renderTables() {
        const directory = byId('table-directory');
        directory.append(...data.tables.map(table => tableLink(table.name)));
        const target = byId('tables-content');
        data.groups.forEach(group => {
            const members = data.tables.filter(table => table.group === group.id);
            const heading = element('h2', { class: 'group-heading group-' + group.id }, [element('span', { class: 'legend-dot', 'aria-hidden': 'true' }), group.name, element('span', { class: 'count' }, plural(members.length, 'table'))]);
            const grid = element('div', { class: 'table-grid' });
            members.forEach(table => {
                const thead = element('thead', {}, element('tr', {}, ['Column', 'Type', 'Keys', 'Null', 'Default'].map(text => element('th', { scope: 'col' }, text))));
                const tbody = element('tbody');
                table.columns.forEach(column => tbody.append(element('tr', {}, [
                    element('td', {}, [column.name, column.enum ? element('span', { class: 'column-enum' }, column.enum.join(' · ')) : null]),
                    element('td', { class: 'type-cell' }, column.type), element('td', {}, chips(column)),
                    element('td', {}, column.null ? 'Yes' : 'No'), element('td', { class: 'default-cell' }, column.default ?? '—')
                ])));
                function references(label, names) {
                    const content = [element('strong', {}, label + ': ')];
                    if (!names.length) content.push('None');
                    names.forEach((name, i) => { if (i) content.push(', '); content.push(tableLink(name)); });
                    return element('p', {}, content);
                }
                const constraints = element('details', { class: 'constraint-details' }, [element('summary', {}, 'Constraints & indexes'), element('ul', {}, [
                    ...enforcedRules(table).map(rule => element('li', {}, rule)),
                    ...table.indexes.filter(index => !index.unique).map(index => element('li', {}, [element('code', {}, index.name), ': ' + indexDescription(table, index)]))
                ])]);
                grid.append(element('article', { class: 'table-card', id: 'table-' + table.name, tabindex: '-1', 'aria-label': table.name + ' table' }, [
                    element('header', { class: 'table-card-header' }, [element('h3', {}, table.name), element('p', {}, table.description + ' ' + plural(table.columns.length, 'column') + '.')]),
                    element('div', { class: 'column-scroll' }, element('table', { class: 'column-table', 'aria-label': table.name + ' columns' }, [thead, tbody])),
                    element('footer', { class: 'references' }, [references('Points to', uniqueNames(outgoing(table.name).map(link => link.to))), references('Referenced by', uniqueNames(incoming(table.name).map(link => link.from)))]), constraints
                ]));
            });
            target.append(element('section', { class: 'catalog-group' }, [heading, grid]));
        });
    }

    function renderRules() {
        const target = byId('rules-content');
        target.append(element('div', { class: 'notice' }, 'Primary keys identify records. Foreign keys require existing parents, but do not require a parent to have any children. Optional references are shown as zero-or-one in the diagrams.'));
        target.append(element('div', { class: 'rule-grid' }, data.tables.map(table => element('article', { class: 'rule-card' }, [element('h3', {}, tableLink(table.name)), element('ul', {}, enforcedRules(table).map(rule => element('li', {}, rule)))]))));
        target.append(element('h2', { class: 'section-title' }, 'Stored values → what people see'));
        target.append(element('p', { class: 'section-copy' }, data.project.statusExplanation));
        const statuses = element('div', { class: 'status-grid' });
        data.tables.forEach(table => (table.statusMappings || []).forEach(mapping => statuses.append(element('article', { class: 'status-card' }, [
            element('h3', {}, table.name + '.' + mapping.column), element('table', { class: 'status-table', 'aria-label': table.name + ' ' + mapping.column + ' labels' }, [
                element('thead', {}, element('tr', {}, [element('th', { scope: 'col' }, 'Stored'), element('th', { scope: 'col' }, 'Displayed meaning')])),
                element('tbody', {}, Object.entries(mapping.values).map(([stored, label]) => element('tr', {}, [element('td', {}, element('code', {}, stored)), element('td', {}, label)])))
            ])
        ]))));
        target.append(statuses, element('h2', { class: 'section-title' }, 'Enforced by the application'));
        target.append(element('p', { class: 'section-copy' }, 'These responsibilities are important, but they are not guarantees provided by the CREATE TABLE script alone.'));
        target.append(element('div', { class: 'application-list' }, data.applicationRules.map(rule => element('article', { class: 'application-rule' }, [element('h3', {}, rule.title), element('p', {}, rule.text)]))));
    }

    const sql = generateSQL();
    byId('sql-code').textContent = sql;
    const sqlFilename = data.project.database.replace(/[^\w-]/g, '-') + '-current-schema.sql';
    byId('sql-filename').textContent = sqlFilename;
    byId('sql-description').textContent = 'The current ' + data.project.database + ' structure: ' + plural(data.tables.length, 'table') + ' in dependency order, preserving actual types, constraint names, defaults and indexes. This is a schema-only script for presentation or an empty existing database. It creates no database, copies no records, and refuses to run when these application tables already exist. It is not a migration.';
    byId('copy-sql').addEventListener('click', async () => {
        try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(sql);
            else throw Error('Use clipboard fallback');
            byId('sql-status').textContent = 'SQL copied to clipboard.';
        } catch (_) {
            const proxy = element('textarea', { class: 'clipboard-proxy', 'aria-label': 'SQL clipboard buffer' });
            proxy.value = sql;
            document.body.append(proxy);
            proxy.select();
            const copied = document.execCommand('copy');
            proxy.remove();
            byId('copy-sql').focus();
            byId('sql-status').textContent = copied ? 'SQL copied to clipboard.' : 'Clipboard access is unavailable. Select the SQL or use Download .sql.';
        }
    });
    byId('download-sql').addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([sql], { type: 'text/plain;charset=utf-8' }));
        const link = element('a', { href: url, download: sqlFilename, hidden: true });
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        byId('sql-status').textContent = 'SQL download started: ' + sqlFilename;
    });

    function cardinality(parent, x, y, direction, kind) {
        const group = svgElement('g', { class: 'cardinality', 'aria-hidden': 'true' });
        const point = distance => x + direction * distance;
        if (kind === 'many' || kind === 'zeroMany') {
            group.append(svgElement('path', { d: 'M ' + point(15) + ' ' + y + ' L ' + point(3) + ' ' + (y - 6) + ' M ' + point(15) + ' ' + y + ' L ' + point(3) + ' ' + (y + 6) + ' M ' + point(15) + ' ' + y + ' L ' + point(3) + ' ' + y }));
        } else {
            group.append(svgElement('line', { x1: point(7), y1: y - 6, x2: point(7), y2: y + 6 }));
        }
        if (kind === 'zeroOne' || kind === 'zeroMany') group.append(svgElement('circle', { class: 'cardinality-circle', cx: point(23), cy: y, r: 3.8 }));
        else group.append(svgElement('line', { x1: point(kind === 'one' ? 16 : 23), y1: y - 6, x2: point(kind === 'one' ? 16 : 23), y2: y + 6 }));
        parent.append(group);
    }

    function buildDiagram(mode) {
        const detailed = mode === 'schema';
        const state = { manualZoom: false, scale: 1, selected: null, hovered: null };
        const root = byId(mode + '-content');
        const heading = element('div', { class: 'view-heading' }, [element('div', {}, [element('p', { class: 'eyebrow' }, detailed ? 'A field-by-field view' : 'The relational overview'), element('h2', {}, detailed ? 'Follow each foreign key.' : 'See how the pieces connect.')]), element('p', {}, detailed ? 'Links attach to the exact foreign-key and referenced-key rows. Zoom in to inspect individual columns.' : 'Compact entities with primary keys. Crow’s feet describe the number of records allowed at each end.')]);
        const hideHub = element('input', { id: mode + '-hide-hub', type: 'checkbox', checked: true });
        const showNames = element('input', { id: mode + '-show-names', type: 'checkbox', checked: true });
        const lineCount = element('span', { class: 'line-count', id: mode + '-line-count', 'aria-live': 'polite' });
        const options = element('div', { class: 'diagram-options' }, [element('label', { class: 'check-control', for: hideHub.id }, [hideHub, 'Hide ' + data.project.hubTable + ' links', lineCount]), element('label', { class: 'check-control', for: showNames.id }, [showNames, 'Relationship names'])]);
        const zoomOut = element('button', { class: 'zoom-button', type: 'button', 'aria-label': 'Zoom out', id: mode + '-zoom-out' }, '−');
        const zoomIn = element('button', { class: 'zoom-button', type: 'button', 'aria-label': 'Zoom in', id: mode + '-zoom-in' }, '+');
        const fit = element('button', { class: 'zoom-button', type: 'button', id: mode + '-fit' }, 'Fit');
        const readout = element('output', { class: 'zoom-readout', id: mode + '-zoom', 'aria-label': 'Diagram zoom' }, '100%');
        const viewport = element('div', { class: 'diagram-viewport', id: mode + '-viewport', role: 'region', 'aria-label': (detailed ? 'Schema' : 'ER') + ' diagram. Scroll to explore the canvas.', tabindex: '0' });
        const canvas = element('div', { class: 'diagram-canvas' });
        const svg = svgElement('svg', { class: 'diagram-svg', role: 'group', 'aria-label': (detailed ? 'Schema' : 'Entity relationship') + ' diagram for ' + data.project.database, id: mode + '-svg' });
        const info = element('div', { class: 'diagram-info', id: mode + '-info', role: 'status', 'aria-live': 'polite' });
        canvas.append(svg); viewport.append(canvas);
        root.append(heading, element('div', { class: 'diagram-shell' }, [element('div', { class: 'diagram-toolbar' }, [options, element('div', { class: 'zoom-controls' }, [zoomOut, readout, zoomIn, fit])]), viewport, info]));
        const legend = element('div', { class: 'diagram-legend', 'aria-label': 'Table group colors' });
        data.groups.forEach(group => legend.append(element('span', { class: 'legend-item group-' + group.id }, [element('span', { class: 'legend-dot', 'aria-hidden': 'true' }), group.name])));
        const notation = element('div', { class: 'notation-legend', 'aria-label': 'Cardinality notation' });
        [['one', 'Exactly one'], ['zeroOne', 'Zero or one'], ['many', 'One or many'], ['zeroMany', 'Zero or many']].forEach(([kind, label]) => {
            const icon = svgElement('svg', { viewBox: '0 0 48 20', 'aria-hidden': 'true' });
            icon.append(svgElement('line', { x1: 3, y1: 10, x2: 44, y2: 10 }));
            cardinality(icon, 3, 10, 1, kind);
            notation.append(element('span', { class: 'notation-key' }, [icon, label]));
        });
        root.append(legend, notation, element('p', { class: 'diagram-help' }, 'Tab to a table. Enter or Space locks its connections; click it again or click empty canvas to release.' + (detailed ? ' A ? after a column name means nullable.' : ' PK identifies the primary key.')));

        // Canvas measurement is independent of SVG visibility and getBBox().
        const measure = document.createElement('canvas').getContext('2d');
        measure.font = '12px Consolas, monospace';
        const textWidth = text => measure.measureText(text).width;
        const maxName = Math.max(...data.tables.flatMap(table => table.columns.map(column => textWidth(column.name + (column.null ? ' ?' : '')))));
        const maxType = Math.max(...data.tables.flatMap(table => table.columns.map(column => textWidth(column.type))));
        const boxWidth = detailed ? Math.max(410, Math.ceil(88 + maxName + 28 + maxType + 18)) : 250;
        const rowHeight = 26, headerHeight = detailed ? 50 : 65;
        const gap = detailed ? 145 : 120, verticalGap = detailed ? 58 : 45;
        const positions = new Map();
        let worldHeight = 0;
        data.LAYOUT.forEach((column, columnIndex) => {
            let y = 34;
            column.forEach(name => {
                const table = tables.get(name);
                const height = detailed ? headerHeight + table.columns.length * rowHeight : 94;
                positions.set(name, { name, column: columnIndex, x: 44 + columnIndex * (boxWidth + gap), y, width: boxWidth, height, rows: new Map(table.columns.map((field, i) => [field.name, y + headerHeight + (i + .5) * rowHeight])) });
                y += height + verticalGap;
            });
            worldHeight = Math.max(worldHeight, y - verticalGap + 34);
        });
        const worldWidth = 88 + data.LAYOUT.length * boxWidth + (data.LAYOUT.length - 1) * gap + 70;
        svg.setAttribute('viewBox', '0 0 ' + worldWidth + ' ' + worldHeight);
        const linesLayer = svgElement('g', { class: 'relationships-layer' });
        const tablesLayer = svgElement('g', { class: 'tables-layer' });
        svg.append(linesLayer, tablesLayer);
        const nodes = new Map(), edges = new Map(), endpointBuckets = new Map();
        const geometry = data.relationships.map((link, i) => {
            const from = positions.get(link.from), to = positions.get(link.to);
            const sameColumn = from.column === to.column;
            const fromSide = sameColumn || from.column < to.column ? 1 : -1;
            const toSide = sameColumn || from.column > to.column ? 1 : -1;
            const result = { link, from, to, sameColumn, fromSide, toSide, index: i };
            [['from', from, fromSide, link.column], ['to', to, toSide, link.toColumn]].forEach(([end, box, side, columnName]) => {
                const key = [box.name, side, detailed ? columnName : 'box'].join(':');
                if (!endpointBuckets.has(key)) endpointBuckets.set(key, []);
                endpointBuckets.get(key).push({ result, end, box, columnName });
            });
            return result;
        });
        endpointBuckets.forEach(ends => {
            ends.sort((a, b) => {
                const oppositeA = a.end === 'from' ? a.result.to : a.result.from;
                const oppositeB = b.end === 'from' ? b.result.to : b.result.from;
                return oppositeA.y - oppositeB.y || a.result.index - b.result.index;
            });
            ends.forEach((endpoint, i) => {
                const { result, end, box, columnName } = endpoint;
                const center = detailed ? box.rows.get(columnName) : box.y + box.height / 2;
                const band = detailed ? rowHeight - 7 : box.height - 24;
                const y = center - band / 2 + band * (i + 1) / (ends.length + 1);
                result[end + 'Y'] = y;
            });
        });
        geometry.forEach(geo => {
            const { link, from, to, fromSide, toSide, sameColumn } = geo;
            const x1 = from.x + (fromSide === 1 ? from.width : 0), y1 = geo.fromY;
            const x2 = to.x + (toSide === 1 ? to.width : 0), y2 = geo.toY;
            const curve = sameColumn ? 72 + geo.index % 5 * 12 : Math.min(240, Math.max(56, Math.abs(x2 - x1) * .48));
            const cx1 = x1 + fromSide * curve, cx2 = x2 + toSide * curve;
            const path = 'M ' + x1 + ' ' + y1 + ' C ' + cx1 + ' ' + y1 + ' ' + cx2 + ' ' + y2 + ' ' + x2 + ' ' + y2;
            const g = svgElement('g', { class: 'relationship', 'data-from': link.from, 'data-to': link.to, 'data-relation': link.id });
            g.append(svgElement('title', {}, link.from + '.' + link.column + ' ' + link.label + ' ' + link.to + '.' + link.toColumn), svgElement('path', { class: 'relation-path', d: path }));
            cardinality(g, x1, y1, fromSide, link.fromCardinality);
            cardinality(g, x2, y2, toSide, link.toCardinality);
            const label = svgElement('text', { class: 'relation-label', x: .125 * x1 + .375 * cx1 + .375 * cx2 + .125 * x2, y: .5 * (y1 + y2) - 8 }, link.label);
            g.append(label); linesLayer.append(g); edges.set(link.id, { group: g, label, link });
        });

        data.tables.forEach(table => {
            const box = positions.get(table.name);
            const g = svgElement('g', { class: 'diagram-table group-' + table.group, transform: 'translate(' + box.x + ' ' + box.y + ')', tabindex: 0, role: 'button', 'aria-pressed': 'false', 'aria-label': table.name + ', ' + plural(table.columns.length, 'column') + ', primary key ' + table.primaryKey.join(' and ') + '. Select to highlight relationships.', 'data-table': table.name });
            g.append(svgElement('rect', { class: 'table-body', width: box.width, height: box.height, rx: 8 }));
            g.append(svgElement('path', { class: 'table-header', d: 'M 0 8 Q 0 0 8 0 H ' + (box.width - 8) + ' Q ' + box.width + ' 0 ' + box.width + ' 8 V ' + headerHeight + ' H 0 Z' }));
            measure.font = '650 15px Segoe UI, sans-serif';
            const maxTitleWidth = box.width - (detailed ? 90 : 30);
            const titleSize = Math.min(15, 15 * maxTitleWidth / Math.max(1, measure.measureText(table.name).width));
            g.append(svgElement('text', { class: 'table-title', x: 15, y: 26, 'font-size': titleSize }, table.name));
            g.append(svgElement('text', { class: 'table-subtitle', x: detailed ? box.width - 14 : 15, y: detailed ? 26 : 49, 'text-anchor': detailed ? 'end' : 'start' }, plural(table.columns.length, 'column')));
            if (!detailed) g.append(svgElement('text', { class: 'pk-summary', x: 15, y: 84 }, 'PK  ' + table.primaryKey.join(' + ')));
            else table.columns.forEach((column, i) => {
                const rowY = headerHeight + i * rowHeight;
                const row = svgElement('g', { class: 'schema-row', 'data-column': column.name });
                row.append(svgElement('title', {}, table.name + '.' + column.name + ': ' + column.type + (column.null ? ', optional' : ', required') + (column.default !== undefined ? ', default ' + column.default : '')));
                if (i) row.append(svgElement('line', { class: 'row-separator', x1: 0, y1: rowY, x2: box.width, y2: rowY }));
                ['pk', 'fk', 'uq'].filter(flag => column[flag]).forEach((flag, index) => {
                    const chip = svgElement('g', { class: 'key-chip', transform: 'translate(' + (11 + index * 22) + ' ' + (rowY + 7) + ')' });
                    chip.append(svgElement('rect', { width: 19, height: 14, rx: 3 }), svgElement('text', { x: 9.5, y: 10, 'text-anchor': 'middle' }, flag.toUpperCase()));
                    row.append(chip);
                });
                row.append(svgElement('text', { class: 'column-name' + (column.null ? ' column-optional' : ''), x: 88, y: rowY + 18 }, column.name + (column.null ? ' ?' : '')));
                row.append(svgElement('text', { class: 'column-type', x: box.width - 14, y: rowY + 18, 'text-anchor': 'end' }, column.type));
                g.append(row);
            });
            const choose = () => { state.selected = state.selected === table.name ? null : table.name; state.hovered = null; update(); };
            g.addEventListener('pointerenter', () => { state.hovered = table.name; update(); });
            g.addEventListener('pointerleave', () => { state.hovered = null; update(); });
            g.addEventListener('focus', () => { state.hovered = table.name; update(); });
            g.addEventListener('blur', () => { state.hovered = null; update(); });
            g.addEventListener('click', event => { event.stopPropagation(); choose(); });
            g.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); } });
            nodes.set(table.name, g); tablesLayer.append(g);
        });

        function update() {
            const active = state.selected || state.hovered;
            const connected = new Set(active ? [active] : []);
            let count = 0;
            edges.forEach(({ group, label, link }) => {
                const hidden = hideHub.checked && (link.to === data.project.hubTable || link.from === data.project.hubTable);
                // SVG elements do not have an HTMLElement .hidden property.
                group.toggleAttribute('hidden', hidden);
                label.toggleAttribute('hidden', !showNames.checked);
                if (!hidden) count++;
                const related = link.from === active || link.to === active;
                group.classList.toggle('is-active', !!active && related);
                group.classList.toggle('is-dimmed', !!active && !related);
                if (!hidden && related) { connected.add(link.from); connected.add(link.to); }
            });
            nodes.forEach((node, name) => {
                node.classList.toggle('is-dimmed', !!active && !connected.has(name));
                node.classList.toggle('is-selected', name === active);
                node.setAttribute('aria-pressed', String(state.selected === name));
            });
            lineCount.textContent = count + ' / ' + data.relationships.length;
            lineCount.setAttribute('aria-label', count + ' of ' + data.relationships.length + ' relationship lines shown');
            if (active) {
                const to = uniqueNames(outgoing(active).map(link => link.to)).join(', ') || 'none';
                const from = uniqueNames(incoming(active).map(link => link.from)).join(', ') || 'none';
                info.replaceChildren(element('strong', {}, active), ' · Points to: ' + to + ' · Referenced by: ' + from + (state.selected ? ' · Click again to release.' : ' · Click to lock.'));
            } else info.textContent = 'Hover to preview connections. Click or press Enter on a table to lock its relationships.';
            info.title = info.textContent;
        }
        viewport.addEventListener('click', event => {
            if (event.target.closest('.diagram-table')) return;
            state.selected = null; state.hovered = null; update();
        });
        hideHub.addEventListener('change', update);
        showNames.addEventListener('change', update);
        function setScale(next, manual) {
            const old = state.scale;
            const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / old;
            const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / old;
            state.scale = Math.min(2.5, Math.max(.1, next));
            if (manual) state.manualZoom = true;
            svg.setAttribute('width', (worldWidth * state.scale).toFixed(2));
            svg.setAttribute('height', (worldHeight * state.scale).toFixed(2));
            readout.value = Math.round(state.scale * 100) + '%';
            readout.textContent = readout.value;
            if (manual) requestAnimationFrame(() => { viewport.scrollLeft = centerX * state.scale - viewport.clientWidth / 2; viewport.scrollTop = centerY * state.scale - viewport.clientHeight / 2; });
        }
        state.fit = () => {
            if (!viewport.clientWidth || !viewport.clientHeight) return;
            state.manualZoom = false;
            setScale(Math.min(1, (viewport.clientWidth - 50) / worldWidth, (viewport.clientHeight - 50) / worldHeight), false);
            viewport.scrollLeft = 0; viewport.scrollTop = 0;
        };
        zoomOut.addEventListener('click', () => setScale(state.scale / 1.25, true));
        zoomIn.addEventListener('click', () => setScale(state.scale * 1.25, true));
        fit.addEventListener('click', state.fit);
        update();
        requestAnimationFrame(state.fit);
        return state;
    }

    let resizeFrame;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
            const diagram = diagrams.get(activeTab);
            if (diagram && !diagram.manualZoom) diagram.fit();
        });
    });
    renderTables();
    renderRules();
    selectTab('er');
    const initialAnchor = decodeURIComponent(location.hash.slice(1));
    if (initialAnchor.startsWith('table-') && byId(initialAnchor)) {
        selectTab('tables'); requestAnimationFrame(() => byId(initialAnchor).scrollIntoView({ block: 'start' }));
    }
})();
