import path from "path";
import fs from "fs";
import _ from "lodash"
import SchemaSpoiler from "../src/SchemaSpoiler";
import { compile, compileFromFile } from "json-schema-to-typescript"

const schemaPath = path.join(__dirname, "../.demodata/api-docs.json");

const docs = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

; (async function () {

    const spoiler = new SchemaSpoiler(docs);

    const schema = spoiler.extractRefSchema("#/definitions/ResultModel«PageResult«DetailDictionaryUnionSetVo»»");

    // console.log("dto:", JSON.stringify(schema, undefined, "\t"));

    const tsStr = await compile(schema, "BatchSaveApiFromPageDto", {
        declareExternallyReferenced: true,
        bannerComment: ""
    });

    console.log("tsStr:", tsStr);
})()

