const path = require('path');
const fse = require('fs-extra');
const axios = require('axios').default;
const {Proskomma} = require('proskomma-core');

// Convert TSV9 to JSON for Pk Import
const uwTsvToTable = (tsv, hasHeadings) => {
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

// Convert TSV7 to JSON for Pk Import
const uwTsv7ToTable = (tsv, hasHeadings) => {
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
        const ref = inRowCells[0];
        const refRegex = /^\d+:\d+$/;
        if (!ref.match(refRegex)) {
            continue;
        }
        newRow.push(ref);
        newRow.push(ref);
        newRow.push(inRowCells[1]);
        newRow.push(inRowCells[6]);
        ret.rows.push(newRow);
    }
    return ret;
};

const diegesisTsvToTable = (tsv, hasHeadings) => {
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
        ret.rows.push(row.split('\t'));
    }
    return ret;
};

const keywordTsvToTable = (tsv, hasHeadings) => {
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
        ret.rows.push(row.split('\t'));
    }
    return ret;
};

const lemmaTsvToTable = (tsv, hasHeadings) => {
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
        ret.rows.push(row.split('\t'));
    }
    return ret;
};

// Fetchers
const getUrl = async url => {
    const response = await axios.get(url);
    return response.data;
}

const getPath = async filePath => {
    return await fse.readFileSync(path.resolve(filePath)).toString('utf8')
}

// Do Bibles
const getBibles = async (bibleSpecs, succincts) => {
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
                responseData = responseData.replace("\\c 1", "\\mt1 ${source.bookCode}\n\\c 1");
            }
            if (responseData.includes('\\s5')) {
                console.log(`      Fixing s5`);
                responseData = responseData.replace(/\\s5/g, "\\ts\\*");
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
        succincts[docSetId] = {content: pk.serializeSuccinct(docSetId)};
        bible.docSetId = docSetId;
    }
}

// Do BCV Resources
const getBcvResources = async (bcvSpecs, succincts) => {
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
            responseRawData = responseRawData.replace(/\\N/g, "\\n");
            const responseData = JSON.stringify(
                resource.resourceType === 'uWTSV' ?
                    uwTsvToTable(
                        responseRawData,
                        true
                    ) : resource.resourceType === 'uWTSV7' ?
                        uwTsv7ToTable(
                            responseRawData,
                            true
                        ) :
                        diegesisTsvToTable(
                            responseRawData,
                            false
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
        const docsQuery = '{documents {id bookCode: header(id:"bookCode") tableSequences {rows(columns: 0 positions: 1) {text}}}}';
        const response = pk.gqlQuerySync(docsQuery).data.documents;
        for (const doc of response) {
            const docId = doc.id;
            const bookCode = doc.tableSequences[0].rows[0][0].text.split(' ')[0];
            pk.gqlQuerySync(`mutation { addDocumentTags(docSetId: "${docSetId}", documentId: "${docId}", tags: """bookcode:${bookCode}""") }`);
        }
        const metadataTags = `"title:${resource.title}" "copyright:${resource.copyright}" "language:${resource.languageCode}" """owner:${resource.owner}""" """direction:${resource.textDirection}""" """script:${resource.script}""" """resourcetype${resource.resourceType}"""`;
        pk.gqlQuerySync(`mutation { addDocSetTags(docSetId: "${docSetId}", tags: [${metadataTags}]) }`);
        succincts[docSetId] = {content: pk.serializeSuccinct(docSetId)};
        resource.docSetId = docSetId;
    }
}

// Do keyword Resources
const getKeywordResources = async (keywordSpecs, succincts) => {
    console.log("Keyword Resources");
    for (const resource of keywordSpecs) {
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
        let responseRawData = resource.source.url ? await getUrl(resource.source.url) : await getPath(resource.source.filePath);
        const responseData = JSON.stringify(
            keywordTsvToTable(
                responseRawData,
                false
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
        const docSetId = pk.gqlQuerySync('{docSets {id}}').data.docSets[0].id;
        const metadataTags = `"title:${resource.title}" "copyright:${resource.copyright}" "language:${resource.languageCode}" """owner:${resource.owner}""" """direction:${resource.textDirection}""" """script:${resource.script}""" """resourcetype${resource.resourceType}"""`;
        pk.gqlQuerySync(`mutation { addDocSetTags(tags: [${metadataTags}]) }`);
        succincts[docSetId] = {
            content: pk.serializeSuccinct(docSetId),
            bcvUsage: resource.articleBcvs
        };
        resource.docSetId = docSetId;
    }
}

// Do keyword Resources
const getLemmaResources = async (lemmaSpecs, succincts) => {
    console.log("Lemma Resources");
    for (const resource of lemmaSpecs) {
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
        let responseRawData = resource.source.url ? await getUrl(resource.source.url) : await getPath(resource.source.filePath);
        const responseData = JSON.stringify(
            lemmaTsvToTable(
                responseRawData,
                false
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
        const docSetId = pk.gqlQuerySync('{docSets {id}}').data.docSets[0].id;
        const metadataTags = `"title:${resource.title}" "copyright:${resource.copyright}" "language:${resource.languageCode}" """owner:${resource.owner}""" """direction:${resource.textDirection}""" """script:${resource.script}""" """resourcetype${resource.resourceType}"""`;
        pk.gqlQuerySync(`mutation { addDocSetTags(tags: [${metadataTags}]) }`);
        succincts[docSetId] = {
            content: pk.serializeSuccinct(docSetId),
        };
        resource.docSetId = docSetId;
    }
}

// Prune Specs before serializing (destructive)

const pruneSpecs = specs => {
    for (const spec of specs) {
        for (const contentKey of ['bibles', 'bcvResources', 'keywordResources', 'lemmaResources']) {
            if (spec[contentKey]) {
                for (const specItem of spec[contentKey]) {
                    if (specItem['sources']) {
                        for (const source of specItem['sources']) {
                            delete source.url;
                            delete source.filePath;
                        }
                    }
                    if (specItem['source']) {
                        delete specItem['source'].url;
                        delete specItem['source'].filePath;
                    }
                }
            }
        }
        if (spec.keywordResources) {
            for (const specItem of spec.keywordResources) {
                delete specItem.articleBcvs;
            }
        }
    }
    return specs
}

// Do Content
const getContent = async specIndex => {
    let specs = [];
    for (const specUrl of specIndex) {
        const succincts = {};
        const spec = fse.readJsonSync(path.resolve(process.argv[2], specUrl));
        specs.push(spec);
        console.log("\n**", spec.title, "**");
        await getKeywordResources(spec.keywordResources, succincts);
        await getBcvResources(spec.bcvResources, succincts);
        await getLemmaResources(spec.lemmaResources, succincts);
        await getBibles(spec.bibles, succincts);
        fse.writeJsonSync(path.join(toUploadDir, spec.url), succincts);
    }
    fse.writeJsonSync(path.join(toUploadDir, 'index.json'), pruneSpecs(specs));
}

const usage = "USAGE: node index.js <specDir> <toUploadDir>";
if (process.argv.length !== 4) {
    console.log(`Wrong number of arguments\n${usage}`);
    process.exit(1);
}
// Make output dir
const toUploadDir = path.resolve(process.argv[3]);
if (fse.existsSync(toUploadDir)) {
    console.log(`toUploadDir '${toUploadDir}' already exists\n${usage}`);
    process.exit(1);
}
fse.mkdirsSync(toUploadDir);

// Read index
const specIndexUrl = path.resolve(process.argv[2], "index.json");
if (!fse.existsSync(specIndexUrl)) {
    console.log(`specIndex '${specIndexUrl}' does not exist\n${usage}`);
    process.exit(1);
}
const specIndex = fse.readJsonSync(specIndexUrl);

// Do processing
getContent(specIndex).then();

