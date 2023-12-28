import _ from "lodash";
import { toSafeString } from ".";

interface ExistFunction {
    (name: string): boolean;
}

interface NameHandler {
    (
        name: string,
        options: { isExist: ExistFunction } & NameFactoryOptions
    ): string;
}

function getValidWords(url: string) {
    return url
        .split("/")
        .filter(
            (u) =>
                u.trim().length > 0 && !u.startsWith(":") && !u.startsWith("{")
        );
}
0;

const nameHandler: NameHandler = (
    pathValue: string,
    { isExist  }
) => {
    let name: string;

    let words = getValidWords(pathValue);

    switch (words.length) {
        case 0:
            throw new Error(`wow!, crate name failed`);
        case 1:
            name =  toSafeString(words[0]);
        case 2:
            name = toSafeString(words[0] + words[1]);
        default:
            // /api/category/list
            // list category api
            words = words.reverse();
            name = toSafeString(words[1] + words[0]);
            if (!isExist(name)) {
                return name;
            }
            const bakWords = words.slice(2);
            for (let i = 0; i < bakWords.length; i++) {
                name = toSafeString(`${bakWords[i]}${name}`);
                if (!isExist(name)) {
                    return name;
                }
            }
    }

    const maxCount = 99;
    let tempName = "";
    for (let i = 0; i < maxCount; i++) {
        tempName == toSafeString(`${name}_${i + 1}`);
        if (isExist(tempName)) {
            return tempName;
        }
    }

    throw new Error(`wow!, crate api name failed`);
};

interface NameFactoryOptions {
    /**
     * 最小单词数，默认2
     */
    minWords?: number;

    firstToUpper?: boolean;
}

const DEFAULT_OPTIONS: NameFactoryOptions = {
    minWords: 2,
    firstToUpper: false,
};

export default class NameFactory {
    private options: NameFactoryOptions = {
        minWords: 2,
    };

    constructor(options: NameFactoryOptions = DEFAULT_OPTIONS) {
        this.options = _.merge(this.options, options);
    }

    #names = new Set<string>();

    isExist = (name: string) => {
        return this.#names.has(name);
    };

    genName(path: string, handler: NameHandler = nameHandler) {
        let name = handler.call(null, path, {
            isExist: this.isExist,
        });

        const { firstToUpper } = this.options;

        if (firstToUpper !== true) {
            name = _.lowerFirst(name);
        }

        this.#names.add(name);

        return name;
    }

    getNames() {
        return [...this.#names.values()];
    }
}
