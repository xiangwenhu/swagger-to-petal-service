import { Key, compile, pathToRegexp  } from "path-to-regexp";

function pathToUrl(path: string, pathParams: Object | undefined) {
    path = path.replace(/\/\{/img, "/:").replace(/\}/img, "");
    const toPath = compile(path, { encode: encodeURIComponent });
    const rPath = toPath(pathParams);
    return rPath;
}


const urlValue = '/api/personnel/config/deleteRoleFieldConfig/:id'

const url = pathToUrl(urlValue,{id:100});

let keys: Key[] = [];
pathToRegexp(urlValue, keys);

console.log("url:", keys)