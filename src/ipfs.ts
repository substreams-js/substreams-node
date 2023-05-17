import { DEFAULT_IPFS } from "./index.js";

export const pattern = /^Qm[1-9A-Za-z]{44}$/

export const test = ( str: string ) => pattern.test(str);

export function url( ipfs: string, href = DEFAULT_IPFS ) {
    return `${href}${ipfs}`;
}