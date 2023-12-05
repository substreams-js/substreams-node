import { createNodeTransport } from "./createNodeTransport.js";

// make it backwards compatible for those still using `createDefaultTransport`
export const createDefaultTransport = createNodeTransport;
