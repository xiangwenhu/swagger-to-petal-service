import { OpenAPIV2 } from "openapi-types";
import { JSONSchema, compile } from "json-schema-to-typescript";
import path from "path";
import fs from "fs";
import { upperFirst } from "lodash";
import { getTypeNameFromRef } from "../util/docs";

const docs: OpenAPIV2.Document = require("../../.demodata/api-docs.json");

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

function getResTypeNames(apis: APIItem[]) {
    const typeNames: string[] = [];

    apis.forEach((api: APIItem) => {
        // 200
        const okResponse: OpenAPIV2.Response | undefined = api.responses[200];
        if (okResponse) {
            if ("$ref" in okResponse) {
                const referenceObject = okResponse as OpenAPIV2.ReferenceObject;
                const typeName = getTypeNameFromRef(referenceObject.$ref);
                if (typeName) {
                    typeNames.push(typeName);
                }
            } else {
                const res = okResponse as OpenAPIV2.ResponseObject;
                if (res.schema) {
                    if (res.schema?.$ref) {
                        const referenceObject =
                            res.schema as OpenAPIV2.ReferenceObject;
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
        }
    });
}

function getPathTypeNames(apis: APIItem[]) {
    const typeNames: string[] = [];

    apis.forEach((api: APIItem) => {
        const parameters = api.parameters || [];

        parameters.forEach((param) => {
            if ("$ref" in param) {
                const referenceObject = param as OpenAPIV2.ReferenceObject;
                throw new Error('暂未支持 reference parameter');
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

function toService(apis: APIItem[]) {
    const queryTypeNames: string[] = [];
    const pathTypeNames: string[] = [];
    const bodyTypeNames: string[] = [];
    const resTypeNames: string[] = [];

    console.log("resTypeNames", resTypeNames);
}

(async function init() {
    // console.log("apis:", apis.length);
    const apis = toList(docs);
    toService(apis);
})();
