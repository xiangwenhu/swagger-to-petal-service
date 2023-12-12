import { OpenAPIV2 } from "openapi-types";
import { JSONSchema, compile, compileFromFile } from "json-schema-to-typescript"
import path from "path";
import fs from "fs";

const docs: OpenAPIV2.Document = require('../../.demodata/api-docs-mcc.json');

; ( async function init() {

    if (!docs.definitions) {
        return;
    }

    const keys = Object.keys(docs.definitions)

    const results = [];
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const definition = docs.definitions[key];

        definition.definitions = docs.definitions;

        const ts = await compile(definition as JSONSchema, key, {
            bannerComment: "",
            additionalProperties: false
        })
        results.push(ts);

    }

    const dist = path.join(__dirname, "../../.demoService/types.ts");

    fs.writeFileSync(dist, results.join("\r\n"))

})();