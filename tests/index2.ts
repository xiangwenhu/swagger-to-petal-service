import { JSONSchema4 } from "json-schema"
import path from "path";
import { compile, compileFromFile } from "json-schema-to-typescript"

const fPath = path.join(__dirname, "../.demodata/api-docs.json")
const apiDocs = require(fPath);

const jsonSchema: any = {
    "name": "batchSaveApiFromPageDto",
    "description": "batchSaveApiFromPageDto",
    "required": true,
    // "schema": {
        // "$ref": "#/definitions/BatchSaveApiFromPageDto"
    // },
    // ,
    "properties": {
        "$ref": "#/definitions/BatchSaveApiFromPageDto"
    },
    "definitions": apiDocs.definitions
};

; (async function () {

    const result = await compile(jsonSchema, "queryApiAndStaticDictionary", {
        bannerComment: "",
        // declareExternallyReferenced: true,
        // additionalProperties: false
    })
    // const result2 = await compileFromFile(fPath)
    console.log("result:", result);

})()