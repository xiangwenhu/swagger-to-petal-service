import * as ts from "openapi-typescript";
import fs from "fs";
import path from "path"


; (async function () {
    const schema = require("../../.demodata/v3-1.json");

    const result = await ts.default(schema);

    console.log("result?:", result);

    fs.writeFileSync(path.join(__dirname, "../../.demoService/v3.ts"), result)

})();