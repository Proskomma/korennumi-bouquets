const path = require('path');
const fse = require('fs-extra');
const axios = require('axios').default;
const {Proskomma} = require('proskomma-core');

const usage = "USAGE: node index.js <spec> <dataPath>";
if (process.argv.length !== 4) {
    console.log(`Wrong number of arguments\n${usage}`);
    process.exit(1);
}

const spec = fse.readJsonSync(path.resolve(process.argv[2]));
const succincts = {};

// Convert TSV to JSON for Pk Import
const tsvToTable = (tsv, hasHeadings) => {
    const ret = {
        headings: [],
        rows: [],
    };
    let rows = tsv.split(/[\n\r]+/);

    if (hasHeadings) {
        ret.headings = rows[0].split('\t');
        rows = rows.slice(1);
    }

    for (const row of rows) {
        const inRowCells = row.split('\t');
        let newRow = [];
        if (inRowCells[1] !== (parseInt(inRowCells[1])).toString()) {
            continue;
        }
        if (inRowCells[2] !== (parseInt(inRowCells[2])).toString()) {
            continue;
        }
        const ref = `${inRowCells[0]} ${inRowCells[1]}:${inRowCells[2]}`;
        newRow.push(ref);
        newRow.push(ref);
        newRow.push(inRowCells[3]);
        newRow.push(inRowCells[8]);
        ret.rows.push(newRow);
    }
    return ret;
};

// Fetchers
const getUrl = async url => {
    const response = await axios.get(url);
    return response.data;
}

const getPath = async filePath => {
    return await fse.readFileSync(filePath).toString('utf8')
}

// Do Bibles
const getBibles = async bibleSpecs => {
    console.log("Bibles");
    for (const bible of bibleSpecs) {
        console.log(`  ${bible.title}`);
        const pk = new Proskomma([
            {
                name: "source",
                type: "string",
                regex: "^[^\\s]+$"
            },
            {
                name: "project",
                type: "string",
                regex: "^[^\\s]+$"
            },
            {
                name: "revision",
                type: "string",
                regex: "^[^\\s]+$"
            },
        ]);
        for (const source of bible.sources) {
            console.log(`    ${source.bookCode}`);
            let responseData = source.url ? await getUrl(source.url) : await getPath(source.filePath);
            if (!responseData.includes('\\mt')) {
                console.log(`      Fixing USFM`);
                responseData = responseData.replace("\\c 1", "\\mt1 ${source.bookCode}\n\\c 1")
            }
            pk.importDocument(
                {
                source: bible.selectors.source,
                project: bible.selectors.project,
                revision: bible.selectors.revision
            },
                "usfm",
                responseData
            )
        }
        console.log(`    Adding tags`);
        const docSetId = pk.gqlQuerySync('{docSets {id}}').data.docSets[0].id;
        let metadataTags = `"title:${bible.title}" "copyright:${bible.copyright}" "language:${bible.languageCode}" """owner:${bible.owner}""" """direction:${bible.textDirection}""" """script:${bible.script}"""`;
        pk.gqlQuerySync(`mutation { addDocSetTags(docSetId: "${docSetId}", tags: [${metadataTags}]) }`);
        succincts[docSetId] = pk.serializeSuccinct(docSetId);
    }
}

// Do BCV Resources
const getBcvResources = async bcvSpecs => {
    console.log("BCV Resources");
    for (const resource of bcvSpecs) {
        console.log(`  ${resource.title}`);
        const pk = new Proskomma([
            {
                name: "source",
                type: "string",
                regex: "^[^\\s]+$"
            },
            {
                name: "project",
                type: "string",
                regex: "^[^\\s]+$"
            },
            {
                name: "revision",
                type: "string",
                regex: "^[^\\s]+$"
            },
        ]);
        for (const source of resource.sources) {
            console.log(`    ${source.bookCode}`);
            let responseRawData = source.url ? await getUrl(source.url) : await getPath(source.filePath);
            responseRawData = responseRawData.replace(/\([^\)]+\[[^\)]+\][^\)]*\)/g, "");
            const responseData = JSON.stringify(
                tsvToTable(
                    responseRawData,
                    true
                )
            );
            pk.importDocument(
                {
                    source: resource.selectors.source,
                    project: resource.selectors.project,
                    revision: resource.selectors.revision
                },
                "tsv",
                responseData
            )
        }
        const docSetId = pk.gqlQuerySync('{docSets {id}}').data.docSets[0].id;
        succincts[docSetId] = pk.serializeSuccinct(docSetId);
    }
}

// Do Content
const getContent = async spec => {
    await getBcvResources(spec.bcvResources);
    await getBibles(spec.bibles);
    fse.writeJsonSync(path.resolve(process.argv[3]), succincts);
}

getContent(spec).then();

