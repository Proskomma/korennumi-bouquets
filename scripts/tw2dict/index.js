const path = require('path');
const fse = require('fs-extra');

const usage = "USAGE: node index.js <twDir> <dictTSVPath>";
if (process.argv.length !== 4) {
    console.log(`Wrong number of arguments\n${usage}`);
    process.exit(1);
}

const bookCodes = ['PHP', 'TIT'];
const lang = 'en';

// Find articles and uses for selected books from TWL

let tsvs = [];
for (const bookCode of bookCodes) {
    const tsvChars = fse.readFileSync(path.resolve(`../../dataSources/en/twl/twl_${bookCode}.tsv`))
        .toString("utf8")
        .trim();

    const tsvCells = tsvChars
        .split('\n')
        .slice(1)
        .map(r => r.split('\t'));

    tsvCells.forEach(r => r[0] = bookCode + " " + r[0]);
    tsvCells.forEach(r => tsvs.push(r));
}

const articleUrls = {};

for (const row of tsvs) {
    const url = row[row.length - 1].split('/').slice(6).join('_');
    if (!articleUrls[url]) {
        articleUrls[url] = {
            bcvs: new Set([])
        }
    }
    articleUrls[url]["bcvs"].add(row[0]);
}

for (const article of Object.values(articleUrls)) {
    article.bcvs = Array.from(article.bcvs).sort(
        (a, b) => {
            const aSplit = [
                a.split(' ')[0],
                parseInt(a.split(' ')[1].split(':')[0]),
                parseInt(a.split(' ')[1].split(':')[1]),
            ];
            const bSplit = [
                b.split(' ')[0],
                parseInt(b.split(' ')[1].split(':')[0]),
                parseInt(b.split(' ')[1].split(':')[1]),
            ];
            if (aSplit[0] > bSplit[0]) {
                return 1;
            }
            if (aSplit[0] < bSplit[0]) {
                return -1;
            }
            return aSplit[1] - bSplit[1] || aSplit[2] - bSplit[2];
        }
    );
}

// Assemble output TSV from TW
const twDir = process.argv[2];
let rows = [];
for (const [articleKey, articleValue] of Object.entries(articleUrls)) {
    let md = fse.readFileSync(path.join(path.resolve(twDir), 'bible', articleKey.split('_').join('/') + '.md'))
        .toString("utf8")
        .trim();
    const articleLocalName = md.split('\n')[0].split(' ').filter(w => w !== '#').join(' ');
    articleValue.localTitle = articleLocalName;
    md = md
        .split('\n')
        .slice(2)
        .join('\n')
        .replace(/\(([^)]|\([^)]+\))+\)+/g, "")
        .replace(/\[[^\]]+\]/g, "")
        .replace(/(, ){2,}/g, "")
        .replace(/\n+$/g, "");
    const row = `${articleKey}\t${articleLocalName}\t${md.replace(/[\n\r]/g, "\\n")}`;
    rows.push(row);
}
fse.writeFileSync(path.resolve(process.argv[3]), rows.join('\n'));

// Make bcv lookup
const lookup = {};
for (const [articleKey, articleValue] of Object.entries(articleUrls)) {
    lookup[articleKey] = {
        bcv: articleValue["bcvs"],
        i18n: {}
    }
    lookup[articleKey]["i18n"][lang] = articleValue["localTitle"];
}
console.log(JSON.stringify(lookup, null, 2));
