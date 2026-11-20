// Browser acceptance checks for the four-file, buildless documentation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { model, sql, stats } = require('./validate-database-docs.cjs');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }
const root = path.resolve(__dirname, '../docs/database');
const output = path.resolve(__dirname, 'artifacts/database-docs');
fs.mkdirSync(output, { recursive: true });
const files = new Set(['database.html', 'database.css', 'database.js', 'database-data.js']);
const server = http.createServer((req, res) => {
    const file = new URL(req.url, 'http://localhost').pathname.slice(1) || 'database.html';
    if (!files.has(file)) { res.writeHead(404).end(); return; }
    const contentType = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' });
    res.end(fs.readFileSync(path.join(root, file)));
});
const checks = [], errors = [];
async function check(name, run) { await run(); checks.push(name); console.log('PASS ' + name); }
async function main() {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CAMPUS_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, colorScheme: 'light', acceptDownloads: true });
        await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
        const page = await context.newPage();
        page.setDefaultTimeout(10000);
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(origin + '/database.html');
        await page.locator('#er-svg .diagram-table').first().waitFor();
        await check('Initial ER diagram, metrics and group legend render', async () => {
            assert.equal(await page.locator('#er-svg .diagram-table').count(), stats.tables);
            assert.equal(await page.locator('#metrics .metric').count(), 3);
            assert.equal(await page.locator('#er-content .legend-item').count(), model.groups.length);
            assert.equal(await page.locator('[style]').count(), 0);
            await page.screenshot({ path: path.join(output, 'er-desktop.png'), fullPage: true });
        });
        for (const mode of ['er', 'schema']) {
            await page.locator('#tab-' + mode).click();
            await page.locator('#' + mode + '-svg .diagram-table').first().waitFor();
            await check(mode + ': hub and name toggles really change SVG computed display', async () => {
                const hubCount = model.relationships.filter(link => link.to === model.project.hubTable || link.from === model.project.hubTable).length;
                const visible = () => page.locator('#' + mode + '-svg .relationship').evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).display !== 'none').length);
                assert.equal(await visible(), stats.relationships - hubCount);
                await page.locator('#' + mode + '-hide-hub').uncheck();
                assert.equal(await visible(), stats.relationships);
                assert.equal(await page.locator('#' + mode + '-line-count').textContent(), stats.relationships+' / '+stats.relationships);
                await page.locator('#' + mode + '-show-names').uncheck();
                assert.equal(await page.locator('#' + mode + '-svg .relation-label').evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).display !== 'none').length), 0);
                await page.locator('#' + mode + '-show-names').check();
                assert.equal(await page.locator('#' + mode + '-svg .relation-label').evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).display !== 'none').length), stats.relationships);
                await page.locator('#' + mode + '-hide-hub').check();
            });
            await check(mode + ': select, second click, empty space and keyboard release', async () => {
                const table = page.locator('#' + mode + '-svg [data-table="Properties"]');
                await table.click(); assert.equal(await table.getAttribute('aria-pressed'), 'true');
                assert(await page.locator('#' + mode + '-svg .relationship.is-active').count() > 0);
                assert(await page.locator('#' + mode + '-svg .diagram-table.is-dimmed').count() > 0);
                assert.match(await page.locator('#' + mode + '-info').textContent(), /Referenced by:/);
                await table.click(); assert.equal(await table.getAttribute('aria-pressed'), 'false');
                await table.focus(); await page.keyboard.press('Enter'); assert.equal(await table.getAttribute('aria-pressed'), 'true');
                await page.locator('#' + mode + '-viewport').click({ position: { x: 4, y: 4 } });
                assert.equal(await table.getAttribute('aria-pressed'), 'false');
                await table.focus(); await page.keyboard.press('Space'); assert.equal(await table.getAttribute('aria-pressed'), 'true');
                await page.keyboard.press('Space'); assert.equal(await table.getAttribute('aria-pressed'), 'false');
            });
            await check(mode + ': zoom, manual resize policy and Fit', async () => {
                const svg = page.locator('#' + mode + '-svg');
                const initial = Number(await svg.getAttribute('width'));
                await page.locator('#' + mode + '-zoom-in').click();
                const zoomed = Number(await svg.getAttribute('width')); assert(zoomed > initial);
                await page.setViewportSize({ width: 1250, height: 950 }); await page.waitForTimeout(100);
                assert.equal(Number(await svg.getAttribute('width')), zoomed, 'Manual zoom must survive resizing');
                await page.locator('#' + mode + '-zoom-out').click();
                assert(Number(await svg.getAttribute('width')) < zoomed);
                await page.locator('#' + mode + '-fit').click();
                const fitWidth = Number(await svg.getAttribute('width'));
                // Use a narrow viewport: a tall schema can remain height-limited at 900px.
                await page.setViewportSize({ width: 390, height: 950 }); await page.waitForTimeout(100);
                assert.notEqual(Number(await svg.getAttribute('width')), fitWidth, 'Fit should resume automatic resizing');
                await page.setViewportSize({ width: 1440, height: 1050 }); await page.waitForTimeout(100);
            });
        }
        await check('Schema boxes contain all columns without text collisions or title overflow', async () => {
            assert.equal(await page.locator('#schema-svg .schema-row').count(), stats.columns);
            const issues = await page.locator('#schema-svg .diagram-table').evaluateAll(nodes => {
                const failures = [], canvas = document.createElement('canvas'), context = canvas.getContext('2d');
                function bounds(node) {
                    const box = node.getBBox();
                    if (box.width) return box;
                    context.font = getComputedStyle(node).font;
                    const width = context.measureText(node.textContent).width;
                    const x = Number(node.getAttribute('x'));
                    return { x: node.getAttribute('text-anchor') === 'end' ? x - width : x, width };
                }
                nodes.forEach(node => {
                    const title = bounds(node.querySelector('.table-title')), count = bounds(node.querySelector('.table-subtitle'));
                    if (title.x + title.width + 8 > count.x) failures.push(node.dataset.table + ' title');
                    node.querySelectorAll('.schema-row').forEach(row => {
                        const name = bounds(row.querySelector('.column-name')), type = bounds(row.querySelector('.column-type'));
                        if (name.x + name.width + 10 > type.x) failures.push(node.dataset.table + '.' + row.dataset.column);
                    });
                });
                return failures;
            });
            assert.deepEqual(issues, []);
            await page.screenshot({ path: path.join(output, 'schema-desktop.png'), fullPage: true });
        });
        await check('All five tabs work and the tablist supports arrow, Home and End keys', async () => {
            await page.locator('#tab-er').focus(); await page.keyboard.press('ArrowRight');
            assert.equal(await page.locator('#tab-schema').getAttribute('aria-selected'), 'true');
            await page.keyboard.press('End'); assert.equal(await page.locator('#tab-rules').getAttribute('aria-selected'), 'true');
            await page.keyboard.press('Home'); assert.equal(await page.locator('#tab-er').getAttribute('aria-selected'), 'true');
            await page.keyboard.press('ArrowLeft'); assert.equal(await page.locator('#tab-rules').getAttribute('aria-selected'), 'true');
            for (const tab of ['er', 'schema', 'tables', 'sql', 'rules']) { await page.locator('#tab-' + tab).click(); assert(await page.locator('#panel-' + tab).isVisible()); assert.equal(await page.locator('[role=tabpanel]:visible').count(), 1); }
        });
        await check('Grouped table cards, every column, reference footers and anchors render', async () => {
            await page.locator('#tab-tables').click();
            assert.equal(await page.locator('.table-card').count(), stats.tables);
            assert.equal(await page.locator('.column-table tbody tr').count(), stats.columns);
            await page.locator('#table-directory [data-table-link="RentalRequests"]').click();
            assert.match(page.url(), /#table-RentalRequests$/);
            assert.equal(await page.evaluate(() => document.activeElement.id), 'table-RentalRequests');
            await page.locator('#table-RentalRequests .references [data-table-link="Users"]').click();
            assert.match(page.url(), /#table-Users$/);
            await page.screenshot({ path: path.join(output, 'tables-desktop.png') });
        });
        await check('SQL copy writes the real clipboard and Download returns the same script', async () => {
            await page.locator('#tab-sql').click();
            assert.equal(await page.locator('#sql-code').textContent(), sql);
            await page.locator('#copy-sql').click();
            const clipboard = await page.evaluate(() => navigator.clipboard.readText());
            assert.equal(clipboard.replace(/\r\n/g, '\n'), sql, 'Windows clipboard line-ending normalization must preserve the SQL');
            const downloadEvent = page.waitForEvent('download'); await page.locator('#download-sql').click();
            const download = await downloadEvent; assert.equal(download.suggestedFilename(), model.project.database + '-current-schema.sql');
            const target = path.join(output, download.suggestedFilename()); await download.saveAs(target);
            assert.equal(fs.readFileSync(target, 'utf8'), sql);
            await page.screenshot({ path: path.join(output, 'sql-desktop.png') });
        });
        await check('Rules explain real constraints, stored statuses and application-only guarantees', async () => {
            await page.locator('#tab-rules').click();
            assert.equal(await page.locator('.rule-card').count(), stats.tables);
            assert.equal(await page.locator('.status-card').count(), model.tables.reduce((count, table) => count + (table.statusMappings || []).length, 0));
            assert.match(await page.locator('#rules-content').innerText(), /not collecting tenant rent/);
            await page.screenshot({ path: path.join(output, 'rules-desktop.png') });
        });
        await check('Phone width has no page overflow; diagram stays in its scroll container', async () => {
            await page.setViewportSize({ width: 390, height: 844 });
            for (const tab of ['er', 'schema', 'tables', 'sql', 'rules']) {
                await page.locator('#tab-' + tab).click(); await page.waitForTimeout(60);
                assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), tab + ' page overflows');
            }
            await page.locator('#tab-er').click(); await page.screenshot({ path: path.join(output, 'er-phone.png'), fullPage: true });
        });
        await check('Dark mode and direct-file access work without a server', async () => {
            await page.setViewportSize({ width: 1440, height: 1050 }); await page.emulateMedia({ colorScheme: 'dark' });
            await page.screenshot({ path: path.join(output, 'er-dark.png'), fullPage: true });
            const filePage = await context.newPage(); filePage.on('pageerror', error => errors.push(error.message));
            await filePage.goto(pathToFileURL(path.join(root, 'database.html')).href);
            assert.equal(await filePage.locator('#er-svg .diagram-table').count(), stats.tables);
            await filePage.locator('#tab-sql').click(); assert.equal(await filePage.locator('#sql-code').textContent(), sql);
            await filePage.close();
        });
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ ...stats, checks, browserErrors: errors }, null, 2));
        console.log('SUCCESS: ' + checks.length + ' browser acceptance checks.');
        await context.close();
    } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
