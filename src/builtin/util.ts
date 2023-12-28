const REG_PATH_PARAM = /{(.*?)}|:(.*?)(?=\?|$)/g;
export function replacePathParams(
    url: string,
    params: Record<string, string | number>
) {
    let matches = url.match(REG_PATH_PARAM);
    if (!matches) {
        return url;
    }
    for (let i = 0; i < matches.length; i++) {
        if (matches[i].charAt(0) === "{" || matches[i].charAt(0) === ":") {
            const key = matches[i].replace(/[{}:]/g, "");
            url = url.replace(matches[i], `${params[key]}`);
        }
    }
    return url;
}

