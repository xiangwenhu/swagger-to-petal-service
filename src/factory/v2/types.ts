import { OpenAPIV2 } from "openapi-types";

export interface APIItemV2 extends OpenAPIV2.OperationObject {
    method: OpenAPIV2.HttpMethods;
    path: string;
    baseType: string;
    types: {
        req: {
            has: boolean;
            type: string;
            properties: Record<string, string>;
        };
        res: {
            has: boolean;
            type: string;
        };
        // TODO::
        header: Record<string, string>;
    };
}