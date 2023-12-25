import _ from "lodash";

export function getTypeNameFromRef($ref: string) {
    const name = $ref.split("/").pop()!;
    return name
        .split(/[«|»]/)
        .map((str) => _.upperFirst(str))
        .join("");
}
