## 参考
https://gitlab.com/galbh/swagger2ts
https://www.npmjs.com/package/rest2ts


https://github.com/Limoer96/service-builder
https://github.com/pansinm/swagger-to-ts
https://www.npmjs.com/package/swagger-2-ts-file
https://github.com/Vc-great/openapi-to



## swagger
https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md
https://swagger.io/docs/


## openAPi
https://www.npmjs.com/package/openapi-types



## 参考2
// 辅助生成 openapi3的协议文档
https://www.npmjs.com/package/openapi3-ts
// openapi 的types申明
https://www.npmjs.com/package/openapi-types

// 生成 ts的代码, https://github.com/drwpow/openapi-typescript/blob/main/packages/openapi-typescript/examples
https://github.com/drwpow/openapi-typescript

// 生成请求服务： 
https://github.com/drwpow/openapi-typescript/blob/main/packages/openapi-fetch
```ts
import createClient from "openapi-fetch";
import type { paths } from "./v1";

const client = createClient<paths>({ baseUrl: "https://catfact.ninja/" });
export default client;
```