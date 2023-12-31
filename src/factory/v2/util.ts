import { OpenAPIV2 } from "openapi-types";
import { APIItemV2 } from "./types";
import { JSONSchema, compile } from "json-schema-to-typescript";
import { getTypeNameFromRef } from "../../util/doc";
import _ from "lodash";
import NameFactory from "../../util/NameFactory";
import { ServiceTagObject } from "../../types";

export function toList(doc: OpenAPIV2.Document) {
    if (!doc.paths) {
        return [];
    }
    const paths = Object.keys(doc.paths);

    const apis: APIItemV2[] = [];
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

export function groupTagApis({ tags, sTags, otherTagServiceName, unNameTagToOtherService }: {
    tags: OpenAPIV2.TagObject[];
    sTags: ServiceTagObject[];
    otherTagServiceName: string;
    unNameTagToOtherService: boolean;
},
    apis: APIItemV2[],
): {
    tag: OpenAPIV2.TagObject;
    apis: APIItemV2[];
}[] {

    const otherTagGroup: {
        tag: ServiceTagObject;
        apis: APIItemV2[];
    } = {
        tag: {
            name: "其他",
            serviceName: otherTagServiceName || 'other'
        },
        apis: []
    }

    const tgs: {
        tag: ServiceTagObject;
        apis: APIItemV2[];
    }[] = [];


    tags.forEach(tag => {
        const configTag = sTags.find(st => st.name == tag.name);
        const tagApis = apis.filter((api) => (api.tags || []).includes(tag.name));
        if (configTag) {
            tgs.push({
                tag: {
                    name: tag.name,
                    description: configTag.description || tag.description,
                    serviceName: configTag.serviceName
                },
                apis: tagApis
            })
        } else if (unNameTagToOtherService) {
            otherTagGroup.apis.push(...tagApis)
        }
    })


    const noTagApis = apis.filter(
        (api) => !Array.isArray(api.tags) || api.tags.length === 0
    );

    otherTagGroup.apis.push(...noTagApis)

    if (otherTagGroup.apis.length > 0) {
        tgs.push(otherTagGroup);
    }

    return tgs;
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

        const fTypeName = hasSelfReference ? `${typeName}_99999` : typeName;
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

async function genResponseTypes(api: APIItemV2, doc: OpenAPIV2.Document) {
    const okResponse: OpenAPIV2.Response | undefined = api.responses[200];
    let schema: JSONSchema | undefined = undefined;
    if (okResponse) {
        if ("$ref" in okResponse) {
            const refType = getTypeNameFromRef(okResponse.$ref);
            return `export type ${api.types.res.type} = ${refType}`;
        } else {
            const res = okResponse as OpenAPIV2.ResponseObject;
            if (res.schema) {
                if (res.schema.$ref) {
                    const refType = getTypeNameFromRef(res.schema.$ref);
                    return `export type ${api.types.res.type} = ${refType}`;
                }
                schema = { ...res.schema } as JSONSchema;
            }
        }
    }
    if (schema === undefined) {
        api.types.res.has = false;
        return undefined;
    }
    schema.definitions = doc.definitions as any;
    const types = await compile(schema, api.types.res.type, {
        bannerComment: "",
        unknownAny: false,
        /**
         * 不申明外部
         */
        declareExternallyReferenced: false,
    });
    return types;
}

async function genRequestParamsTypes(api: APIItemV2, doc: OpenAPIV2.Document) {
    if (!Array.isArray(api.parameters) || api.parameters.length === 0) {
        api.types.req.has = false;
        return undefined;
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
                        const refPath = schema.schema.$ref
                            .replace("#/", "")
                            .replace(/\//g, ".");
                        const schemaData = _.get(doc, refPath);
                        schema = {
                            required: aParameter.required,
                            ...schemaData,
                        };
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
                        g[inType] = schema;
                        break;
                    case "formData":
                        g[inType] = undefined;
                        // TODO::
                        break;
                    default:
                        if (!g[inType]) {
                            g[inType] = {
                                type: "object",
                                properties: {},
                            };
                        }
                        g[inType].properties[parameter.name] = schema;
                }

                return g;
            }
        },
        {}
    );

    Object.keys(groupParams).forEach((key) => {
        api.types.req.properties[key] = `${api.types.req.type}.${key}`;
    });

    const schema = {
        type: "object",
        properties: {
            ...groupParams,
        },
        // TODO:: 按需
        required: Object.keys(groupParams),
        definitions: doc.definitions as any,
    } as any;

    const types = await compile(schema, api.types.req.type, {
        bannerComment: "",
        unknownAny: false,
        /**
         * 不申明外部
         */
        declareExternallyReferenced: false,
        additionalProperties: false,
    });
    return types;
}


function buildRequestConfig(api: APIItemV2) {
    const method = api.method;

    const { req } = api.types;

    const configArr: string[] = [`method: "${method}"`];

    const params = {
        hasPathParams: false,
        hasQueryParams: false,
        hasBody: false,
    };

    if (req.has) {
        Object.entries(req.properties).forEach(([key, value]) => {
            switch (key) {
                case "body":
                    params.hasBody = true;
                    configArr.push(`data: reqParams.${key}`);
                    break;
                case "path":
                    params.hasPathParams = true;
                    configArr.push(
                        `url: replacePathParams('${api.path}', reqParams.${key})`
                    );
                    break;
                case "query":
                    params.hasQueryParams;
                    configArr.push(`params: reqParams.${key}`);
                    break;
                case "formData":
                    params.hasBody = true;
                    configArr.push(`data: reqParams.${key}`);
                    break;
                default:
                    throw new Error(`暂不支持该类型的参数 ${key}`);
            }
        });
    }

    if (!params.hasPathParams) {
        configArr.push(`url: "${api.path}"`);
    }

    return `{${configArr.join(",\r\n")}}`;
}

export function generateAPIService(apis: APIItemV2[]) {
    const imports = apis.map((api) => {
        const types = [];
        if (api.types.req.has) {
            types.push(api.types.req.type);
        }
        if (api.types.res.has) {
            types.push(api.types.res.type);
        }
        return types.filter(Boolean).join(", ");
    }).filter(Boolean);

    const requests = apis.map((api) => {
        const reqParams = api.types.req.has
            ? `reqParams: ${api.types.req.type}`
            : "";

        const resType = api.types.res.has ? api.types.res.type : "void";

        const requestConfig = buildRequestConfig(api);
        return `
        /**
         * ${api.summary}
         */
        export function ${_.lowerFirst(
            api.baseType
        )}(${reqParams}): Promise<${resType}>{
            return instance(${requestConfig})
        }
    `;
    });

    const importsStr = `import { ${imports.join(
        ", "
    )} } from "./service.types";\r\n`;

    const content = importsStr + requests.join("\r\n");
    return content;
}

export async function generateTypes(apis: APIItemV2[], doc: OpenAPIV2.Document) {

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
            const baseType = nf.genName({ path: api.path, method: api.method });
            api.types = {
                res: {
                    has: true,
                    type: `Res${baseType}`,
                },
                req: {
                    has: true,
                    type: `Req${baseType}`,
                    properties: {},
                },
                header: {},
            };
            api.baseType = baseType;
            const resType = await genResponseTypes(api, doc);
            if (resType !== undefined) resTypes.push(resType);

            const reqType = await genRequestParamsTypes(api, doc);
            if (reqType !== undefined) reqTypes.push(reqType);

            //req
        } catch (err) {
            console.error(`generateTypes error:`, err);
        }
    }

    const results = definitionsTypes.concat(reqTypes).concat(resTypes);

    return results.join('\r\n');
}