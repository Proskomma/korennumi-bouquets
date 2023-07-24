const path = require('path');
const fse = require('fs-extra');

const unique = new Set([]);

const uniqueByBook = fse.readJsonSync(path.resolve(process.argv[2]));

for (const book of ["TIT", "PHP", "3JN"]) {
    for (const lemma of uniqueByBook[book]) {
        unique.add(lemma.toLowerCase());
    }
}

console.log(Array.from(unique).sort().map(l => `<key>${l}</key>\n`).join(''));
