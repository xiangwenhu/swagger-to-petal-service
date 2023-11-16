import _ from "lodash";
import { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from "openapi-types"

const TS_W_KEYS = ['items', 'properties']

export default class SchemaSpoiler {
    private docs: OpenAPIV2.Document | OpenAPIV3.Document | OpenAPIV3_1.Document;
    constructor(docs: OpenAPIV2.Document | OpenAPIV3.Document | OpenAPIV3_1.Document;) {
        this.docs = docs;
    }

    extractRefSchema($ref: string) {
        const refPath = $ref.substring(2).replace("/", ".");
        const rootSchema: Record<string, any> = _.cloneDeep(_.get(this.docs, refPath));

        const schema = this.extractSchema(rootSchema);
        return schema;
    }

    extractSchema(schema: any) {
        const cSchema: Record<string, any> = _.cloneDeep(schema);
        for (let [key, value] of Object.entries(cSchema)) {
            if (TS_W_KEYS.includes(key)) {
                continue;
            }
            if (key === "$ref") {
                const refSchema = this.extractRefSchema(value);
                _.merge(cSchema, refSchema)
                delete cSchema.$ref;
            } else if (key === "type") {
                if (value == "object" && _.isObject(cSchema.properties)) {
                    Object.entries(cSchema.properties).forEach(([pk, pv]) => {
                        // @ts-ignore
                        cSchema.properties[pk] = this.extractSchema(pv);
                    })
                } else if (value == "array") {
                    if (Array.isArray(cSchema.items)) {
                        cSchema.items = cSchema.items.map(p => this.extractSchema(p))
                        // @ts-ignore
                    } else if (_.isObject(cSchema.items) && cSchema.items.$ref) {
                        // @ts-ignore
                        cSchema.items = this.extractRefSchema(cSchema.items.$ref)
                    }
                }
            } else {
                cSchema[key] = value;
            }
        }
        return cSchema;
    }
}


