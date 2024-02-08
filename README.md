# `@substreams/node`

[![Build Status](https://github.com/substreams-js/substreams-node/actions/workflows/ci.yml/badge.svg)](https://github.com/substreams-js/substreams-node/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/@substreams%2Fnode.svg)](https://www.npmjs.com/package/@substreams/node)
[![License](https://img.shields.io/github/license/substreams-js/substreams-node)](LICENSE)
[![Try substreams on RunKit](https://badge.runkitcdn.com/@substreams/node.svg)](https://npm.runkit.com/@substreams/node)

> Substreams for `Node.js` & Web

## Install

```sh
npm install @substreams/node
```

**⚠️Warning:** This package is native [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules). If your project uses CommonJS, you'll have to [convert to ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) or use the [dynamic `import()`](https://v8.dev/features/dynamic-import) function. Please don't open issues for questions regarding CommonJS / ESM.

## Example

```typescript
import { createModuleHashHex, createRegistry, createRequest } from "@substreams/core";
import { readPackage } from "@substreams/manifest";
import { BlockEmitter } from "@substreams/node";
import { createNodeTransport } from "@substreams/node/createNodeTransport";
// or
import { createWebTransport } from "@substreams/node/createWebTransport";

// auth API token
// https://app.streamingfast.io/
// https://app.pinax.network/
if (!process.env.SUBSTREAMS_API_KEY) {
  throw new Error("SUBSTREAMS_API_KEY is require");
}

const token = process.env.SUBSTREAMS_API_KEY;
const baseUrl = "https://eth.substreams.pinax.network:443";

// User parameters
const manifest = "https://github.com/pinax-network/substreams-erc20-balance-changes/releases/download/v1.2.0/erc20-balance-changes-mainnet-v1.2.0.spkg";
const outputModule = "map_balance_changes";
const startBlockNum = 17381140;
const stopBlockNum = "+3";

// Read Substream
const substreamPackage = await readPackage(manifest);
if (!substreamPackage.modules) {
  throw new Error("No modules found in substream package");
}
const moduleHash = await createModuleHashHex(substreamPackage.modules, outputModule);
console.log({ moduleHash });

// Connect Transport
const headers = new Headers({ "X-User-Agent": "@substreams/node", "X-Api-Key": SUBSTREAMS_API_KEY });
const registry = createRegistry(substreamPackage);
const transport = createNodeTransport(baseUrl, token, registry, headers);
const request = createRequest({
  substreamPackage,
  outputModule,
  startBlockNum,
  stopBlockNum,
});

// NodeJS Events
const emitter = new BlockEmitter(transport, request, registry);

// Session Trace ID
emitter.on("session", (session) => {
  console.dir(session);
});

// Stream Blocks
emitter.on("anyMessage", (message, cursor, clock) => {
  console.dir(message);
  console.dir(cursor);
  console.dir(clock);
});

// End of Stream
emitter.on("close", (error) => {
  if (error) {
    console.error(error);
  }
  console.timeEnd("🆗 close");
});

// Fatal Error
emitter.on("fatalError", (error) => {
  console.error(error);
});

console.log("✅ start");
console.time("🆗 close");
const cancel = emitter.start();

console.log("✅ start");
console.time("🆗 close");
emitter.start();

// Cancel after 3 seconds
setTimeout(() => {
  emitter.stop();
}, 3000);
```