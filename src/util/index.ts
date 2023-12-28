import crypto from "crypto";
import { deburr, upperFirst, trim } from "lodash";

export function uuid() {
    return crypto.randomUUID();
}



/**
 * Convert a string that might contain spaces or special characters to one that
 * can safely be used as a TypeScript interface or enum name.
 */
export function toSafeString(string: string) {
    // identifiers in javaScript/ts:
    // First character: a-zA-Z | _ | $
    // Rest: a-zA-Z | _ | $ | 0-9
  
    return upperFirst(
      // remove accents, umlauts, ... by their basic latin letters
      deburr(string)
        // replace chars which are not valid for typescript identifiers with whitespace
        .replace(/(^\s*[^a-zA-Z_$])|([^a-zA-Z_$\d])/g, ' ')
        // uppercase leading underscores followed by lowercase
        .replace(/^_[a-z]/g, match => match.toUpperCase())
        // remove non-leading underscores followed by lowercase (convert snake_case)
        .replace(/_[a-z]/g, match => match.substr(1, match.length).toUpperCase())
        // uppercase letters after digits, dollars
        .replace(/([\d$]+[a-zA-Z])/g, match => match.toUpperCase())
        // uppercase first letter after whitespace
        .replace(/\s+([a-zA-Z])/g, match => trim(match.toUpperCase()))
        // remove remaining whitespace
        .replace(/\s/g, ''),
    )
  }