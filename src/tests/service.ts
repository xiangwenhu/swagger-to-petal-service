import { upperFirst } from "lodash";
import { OpenAPIV2 } from "openapi-types";
import NameFactory from "../util/NameFactory";
import { getTypeNameFromRef } from "../util/doc";
import { JSONSchema, compile } from "json-schema-to-typescript";
import fs from "fs";
import path from "path";
import _ from "lodash";

const doc: OpenAPIV2.Document = require("../../.demodata/api-docs.json");

interface APIItem extends OpenAPIV2.OperationObject {
    method: OpenAPIV2.HttpMethods;
    path: string;
}

enum ParametersType {
    /**
     * Body参数
     */
    body = "body",
    /**
     * Path参数
     */
    path = "path",
    /**
     * Query参数
     */
    query = "query",
    /**
     * FormData
     */
    formData = "formData",
}

function toList(doc: OpenAPIV2.Document) {
    if (!doc.paths) {
        return [];
    }
    const paths = Object.keys(doc.paths);

    const apis: APIItem[] = [];
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        const pathItemObj: OpenAPIV2.PathItemObject = doc.paths[path];
        Object.keys(pathItemObj).forEach((method) => {
            const opObj: OpenAPIV2.OperationObject<any> =
                pathItemObj[method as OpenAPIV2.HttpMethods];
            apis.push({
                path,
                method: method,
                ...opObj,
            });
        });
    }
    return apis;
}

function groupTagApis(
    tags: OpenAPIV2.TagObject[],
    apis: APIItem[]
): {
    tag: OpenAPIV2.TagObject;
    apis: APIItem[];
}[] {
    const tgs = tags.map((tag) => {
        return {
            tag,
            apis: apis.filter((api) => (api.tags || []).includes(tag.name)),
        };
    });

    const noTagApis = apis.filter(
        (api) => !Array.isArray(api.tags) || api.tags.length === 0
    );
    if (noTagApis.length > 0) {
        tgs.push({
            tag: {
                name: "未分组",
            },
            apis: noTagApis,
        });
    }

    return tgs;
}

async function toService(apis: APIItem[]) {
    const nf = new NameFactory({
        firstToUpper: true,
    });

    const resTypes: string[] = [];
    const reqTypes: string[] = [];
    // definitions
    const definitionsTypes = await genDefinitionsTypes(doc);
    for (let i = 0; i < apis.length; i++) {
        const api = apis[i];
        try {
            // response
            const baseType = nf.genName(api.path);
            const resType = await genResponseTypes(
                api,
                {
                    baseType,
                    prefix: "Res",
                },
                doc
            );
            resTypes.push(resType);

            const reqType = await genRequestParamsTypes(
                api,
                {
                    baseType,
                    prefix: "Req",
                },
                doc
            );
            reqTypes.push(reqType);

            //req
        } catch (err) {
            debugger;
        }
    }

    const results = definitionsTypes.concat(reqTypes).concat(resTypes);

    fs.writeFileSync(
        path.join(__dirname, "../../demotestss/test.ts"),
        results.join("\r\n")
    );
}

async function genDefinitionsTypes(doc: OpenAPIV2.Document) {
    const types: string[] = [];
    const definitions = doc.definitions || {};
    for (let [typeName, schema] of Object.entries(definitions)) {
        const defPath = `#/definitions/${typeName}`;
        const tmpDefinitions = { ...definitions };
        delete tmpDefinitions[defPath];

        const cSchema = { ...schema, definitions: tmpDefinitions };

        const hasSelfReference = JSON.stringify(schema).includes(defPath);

        const fTypeName = hasSelfReference ? `${typeName}_1` : typeName;
        cSchema.title = fTypeName;

        let typeStr = await compile(cSchema as any, fTypeName, {
            additionalProperties: false,
            bannerComment: "",
            unknownAny: false,
            /**
             * 不申明外部
             */
            declareExternallyReferenced: false,
            $refOptions: {},
        });

        if (hasSelfReference) {
            const regex = new RegExp(fTypeName, "g");
            typeStr = typeStr.replace(regex, typeName);
        }

        types.push(typeStr);
    }
    return types;
}

interface GenResponseOptions {
    baseType: string;
    prefix?: string;
}

function adjustSchema(
    schema: OpenAPIV2.SchemaObject | OpenAPIV2.ReferenceObject,
    doc: OpenAPIV2.Document
) {
    // if ("$ref" in schema) {
    //     // TODO::
    // } else {
    //     const newSchema = schema as OpenAPIV2.SchemaObject;
    //     if (newSchema.schema) {
    //         if (newSchema.schema.$ref) {
    //             const refType = getTypeNameFromRef(newSchema.schema.$ref);
    //             return `export type ${options.prefix || ""}${
    //                 options.baseType
    //             } = ${refType}`;
    //         }
    //         schema = { ...res.schema } as JSONSchema;
    //     }
    // }
}

async function genResponseTypes(
    api: APIItem,
    options: GenResponseOptions,
    doc: OpenAPIV2.Document
) {
    const okResponse: OpenAPIV2.Response | undefined = api.responses[200];
    let schema: JSONSchema | undefined = undefined;
    if (okResponse) {
        if ("$ref" in okResponse) {
            const refType = getTypeNameFromRef(okResponse.$ref);
            return `export type ${options.prefix || ""}${
                options.baseType
            } = ${refType}`;
        } else {
            const res = okResponse as OpenAPIV2.ResponseObject;
            if (res.schema) {
                if (res.schema.$ref) {
                    const refType = getTypeNameFromRef(res.schema.$ref);
                    return `export type ${options.prefix || ""}${
                        options.baseType
                    } = ${refType}`;
                }
                schema = { ...res.schema } as JSONSchema;
            }
        }
    }
    if (schema === undefined) return "";
    schema.definitions = doc.definitions as any;
    const types = await compile(
        schema,
        `${options.prefix}${options.baseType}`,
        {
            bannerComment: "",
            unknownAny: false,
            /**
             * 不申明外部
             */
            declareExternallyReferenced: false,
        }
    );
    return types;
}

async function genRequestParamsTypes(
    api: APIItem,
    options: GenResponseOptions,
    doc: OpenAPIV2.Document
) {
    if (!Array.isArray(api.parameters) || api.parameters.length === 0) {
        return "";
    }

    const groupParams = api.parameters.reduce(
        (
            g: Record<string, any>,
            cur: OpenAPIV2.ReferenceObject | OpenAPIV2.Parameter
        ) => {
            if (g.$ref) {
                console.error(`咱不支持 ReferenceObject parameter`);
                return g;
            } else {
                const parameter = cur as OpenAPIV2.Parameter;
                const inType = parameter.in;

                let aParameter: OpenAPIV2.Parameter = _.cloneDeep(parameter);
                let schema: any = aParameter;
                if (schema.schema) {
                    if (schema.schema.$ref) {
                        const refPath = schema.schema.$ref.replace("#/","").replace(/\//g, ".");
                        const schemaData = _.get(doc, refPath)
                        schema = {
                            required: aParameter.required,
                            ...schemaData
                        }
                    } else {
                        schema = {
                            ...schema,
                            ...schema.schema,
                        };
                    }
                    delete schema.schema;
                }

                switch (inType) {
                    case "body":
                        g.body = schema;
                        break;
                    case "formData":
                        // TODO::
                        break;
                    default:
                        if (!g[parameter.in]) {
                            g[parameter.in] = {
                                type: "object",
                                properties: {},
                            };
                        }
                        g[parameter.in].properties[parameter.name] = schema;
                }

                return g;
            }
        },
        {}
    );

    const schema = {
        type: "object",
        properties: {
            ...groupParams,
        },
        // TODO:: 按需
        required: Object.keys(groupParams),
        definitions: doc.definitions as any,
    } as any;

    const types = await compile(
        schema,
        `${options.prefix}${options.baseType}`,
        {
            bannerComment: "",
            unknownAny: false,
            /**
             * 不申明外部
             */
            declareExternallyReferenced: false,
            additionalProperties: false,
        }
    );
    return types;
}

(async function init() {
    // console.log("apis:", apis.length);
    const apis = toList(doc);
    const tagGroups = groupTagApis(doc.tags || [], apis);
    toService(apis);
})();
