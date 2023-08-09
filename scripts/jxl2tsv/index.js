const path = require('path');
const fse = require('fs-extra');

const jxlJson = fse.readJsonSync(path.resolve(process.argv[2]));

let n = 0;
for (const sentence of jxlJson) {
    n++;
    const clauseRows = sentence.chunks.map(ch => '| ' + ch.source.map(s => s.content).join(' ') + ' | ' + ch.gloss + ' |').join('\\n');
    const cvs = Array.from(new Set(sentence.chunks.map(ch => ch.source.map(s => s.cv)).reduce((a, b) => [...a, ...b], [])));
    console.log(`PHP ${cvs[0]}\tPHP ${cvs[cvs.length - 1]}\t${n}\t${"| GRC | FRA |\\n| --: | :-- |\\n" + clauseRows}`);
}
