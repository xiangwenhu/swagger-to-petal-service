import { OpenAPIV2 } from "openapi-types";
import { JSONSchema, compile, } from "json-schema-to-typescript"
import path from "path";
import fs from "fs";

const docs: OpenAPIV2.Document = require('../../.demodata/api-docs-mcc.json');


interface APIItem extends OpenAPIV2.OperationObject {
    method: OpenAPIV2.HttpMethods;
}

enum  ParametersType {
    /**
     * Body参数
     */
    body = 'body',
    /**
     * Path参数
     */
    path = 'path',
    /**
     * Query参数
     */
    query = 'query',
    /**
     * FormData
     */
    formData = 'formData',
} 


; (async function init() {

    if (!docs.paths) {
        return;
    }

    const paths = Object.keys(docs.paths)

    const apis: APIItem[] = [];
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        const pathItemObj: OpenAPIV2.PathItemObject = docs.paths[path];
        Object.keys(pathItemObj).forEach((method) => {
            const opObj: OpenAPIV2.OperationObject<any> = pathItemObj[method as OpenAPIV2.HttpMethods];
            apis.push({
                method: method,
                ...opObj
            })
        })
    }

    console.log("apis:", apis.length);

})();