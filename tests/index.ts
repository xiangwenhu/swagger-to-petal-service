import { JSONSchema4 } from "json-schema"
import path from "path";
import { compile, compileFromFile } from "json-schema-to-typescript"

const fPath = path.join(__dirname, "../.demodata/api-docs.json")
const apiDocs = require(fPath);

const jsonSchema: any = {
    "title": "Example Schema",
    "definitions": {
        "person": {
            "type": "object",
            "properties": {
                "firstName": {
                    "type": "string"
                },
                "children": {
                    "type": "array",
                    "items": { "$ref": "#/definitions/person" }
                }
            }
        }
    },
    "type": "object",
    "properties": {
        "$ref": "#/definitions/person/properties"
    }
};

; (async function () {

    const result = await compile(jsonSchema, "queryApiAndStaticDictionary", {
        bannerComment: "",
        declareExternallyReferenced: true,
        additionalProperties: false
    })
    // const result2 = await compileFromFile(fPath)
    console.log("result:", result);

})()