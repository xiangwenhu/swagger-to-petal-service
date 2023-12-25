import crypto from "crypto";

export function uuid() {
    return crypto.randomUUID();
}
