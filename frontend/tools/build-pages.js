const fs = require('fs');
function collectPages(folder = 'html') {
    const pagePaths = [];
    const entries = fs.readdirSync(folder, { withFileTypes: true });
    entries.sort((first, second) => first.name.localeCompare(second.name));

    for (const entry of entries) {
        const entryPath = folder + '/' + entry.name;
        if (entry.isDirectory()) {
            pagePaths.push(...collectPages(entryPath));
        } else if (entry.name.endsWith('.html')) {
            pagePaths.push(entryPath.slice('html/'.length));
        }
    }
    return pagePaths;
}
const pages = collectPages().map((name) => {
    // Escape template delimiters so generated JavaScript preserves the HTML exactly.
    const html = fs
        .readFileSync('html/' + name, 'utf8')
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');
    return "    '" + name + "': `" + html + '`';
});
fs.writeFileSync(
    'js/pages.js',
    '// Generated from html/. Do not edit this copy.\nwindow.CampusPages = {\n' +
        pages.join(',\n') +
        '\n};\n'
);
