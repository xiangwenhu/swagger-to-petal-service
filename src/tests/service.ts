import { upperFirst } from "lodash";
import { OpenAPIV2 } from "openapi-types";
import NameFactory from "../util/NameFactory";
import { getTypeNameFromRef } from "../util/docs";
import { JSONSchema, compile } from "json-schema-to-typescript";
import fs from "fs"
import path from "path";

const docs: OpenAPIV2.Document = require("../../.demodata/api-docs-2.json");

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

function toList(docs: OpenAPIV2.Document) {
    if (!docs.paths) {
        return [];
    }
    const paths = Object.keys(docs.paths);

    const apis: APIItem[] = [];
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        const pathItemObj: OpenAPIV2.PathItemObject = docs.paths[path];
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

function getPathTypeNames(apis: APIItem[]) {
    const typeNames: string[] = [];

    apis.forEach((api: APIItem) => {
        const parameters = api.parameters || [];

        parameters.forEach((param) => {
            if ("$ref" in param) {
                const referenceObject = param as OpenAPIV2.ReferenceObject;
                throw new Error("暂未支持 reference parameter");
                // TODO::
                // const typeName = getTypeNameFromRef(referenceObject.$ref);
                // if (typeName) {
                //     typeNames.push(typeName);
                // }
            } else {
                const parameter = param as OpenAPIV2.Parameter;
                if (parameter.schema) {
                    if (parameter.schema?.$ref) {
                        const referenceObject =
                            parameter.schema as OpenAPIV2.ReferenceObject;
                        const typeName = getTypeNameFromRef(
                            referenceObject.$ref
                        );
                        if (typeName) {
                            typeNames.push(typeName);
                        }
                    } else {
                        const typeName = `Res${upperFirst(api.operationId)}`;
                        typeNames.push(typeName);
                    }
                }
            }
        });
    });
}

async function toService(apis: APIItem[]) {
    const nf = new NameFactory({
        firstToUpper: true,
    });

    const resTypes: string[] = [];
    const definitionTypes = await genDefinitionTypes(docs);
    for (let i = 0; i < apis.length; i++) {
        const api = apis[i];
        try {
            // response
            const baseType = nf.genName(api.path);
            const resType = await genResponse(
                api,
                {
                    baseType,
                    prefix: "Res",
                },
                docs
            );

            resTypes.push(resType);

            //
        } catch (err) {
            debugger;
        }
    }

    const results = definitionTypes.concat(resTypes)

    fs.writeFileSync(path.join(__dirname, "../../demotestss/test.ts"), results.join("\r\n"))
}

async function genDefinitionTypes(docs: OpenAPIV2.Document) {
    const types: string[] = [];
    const definitions = docs.definitions || {};
    for (let [typeName, schema] of Object.entries(definitions)) {

        if(typeName === "PageInfoTreeVo") {
            debugger;
        }

        const tmpDefinitions = {...definitions};
        delete tmpDefinitions[`#/definitions/${typeName}`]

        const cSchema = {...schema, definitions: tmpDefinitions}

        const typeStr = await compile(cSchema as any, typeName, {
            bannerComment: "",
            unknownAny: false,
            /**
             * 不申明外部
             */
            declareExternallyReferenced: false,
            $refOptions: {
                
            }
        });

        types.push(typeStr);
    }
    return types;
}

interface GenResponseOptions {
    baseType: string;
    prefix?: string;
}

async function genResponse(
    api: APIItem,
    options: GenResponseOptions,
    docs: OpenAPIV2.Document
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
    schema.definitions = docs.definitions as any;
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

(async function init() {
    // console.log("apis:", apis.length);
    const apis = toList(docs);
    const tagGroups = groupTagApis(docs.tags || [], apis);
    toService(apis);
})();
