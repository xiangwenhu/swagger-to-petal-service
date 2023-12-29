import { JSONSchema, compile, compileFromFile } from "json-schema-to-typescript"


const schema: JSONSchema =      {
    "name": "id_1",
    "in": "query",
    "description": "应用ID",
    "required": false,
    "type": "object",
    "properties": {
        "id": {
            "type": "string"
        }
    }
}

; (async function name() {
    
    const rName = await compile(schema, "id_1");
    console.log(rName);
})()