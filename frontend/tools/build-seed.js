const fs = require('fs');
const seed = JSON.parse(fs.readFileSync('data/campus-seed.json', 'utf8').replace(/^\uFEFF/, ''));
fs.writeFileSync(
    'js/seed.js',
    '// Generated from data/campus-seed.json. Do not edit this copy.\nwindow.CampusSeed = ' +
        JSON.stringify(seed, null, 2) +
        ';\n'
);
