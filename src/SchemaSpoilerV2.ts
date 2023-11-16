import _ from "lodash";
import { OpenAPIV2 } from "openapi-types";


export default class SchemaSpoilerV2 {
    private docs: OpenAPIV2.Document;
    constructor(docs: OpenAPIV2.Document) {
        this.docs = docs;
    }

    private extractRefSchema($ref: string) {
        const refPath = $ref.substring(2).replace("/", ".");
        const rootSchema: Record<string, any> = _.cloneDeep(_.get(this.docs, refPath));

        const schema = this.extractSchema(rootSchema);
        return schema;
    }

    extractSchema(schema: any) {
        const cSchema: Record<string, any> = _.cloneDeep(schema);
        if (cSchema.schema && _.isString(cSchema.schema.$ref)) {
            const refSchema = this.extractRefSchema(cSchema.schema.$ref);
            _.merge(cSchema, refSchema)
            delete cSchema.schema;
        }
        cSchema.definitions = this.docs.definitions;
        return cSchema;
    }
}


