# `@substreams/node`

[![Build Status](https://github.com/substreams-js/substreams-node/actions/workflows/ci.yml/badge.svg)](https://github.com/substreams-js/substreams-node/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/@substreams%2Fnode.svg)](https://www.npmjs.com/package/@substreams/node)
[![License](https://img.shields.io/github/license/substreams-js/substreams-node)](LICENSE)
[![Try substreams on RunKit](https://badge.runkitcdn.com/@substreams/node.svg)](https://npm.runkit.com/@substreams/node)

> Substreams for `Node.js`

## Install

```sh
npm install @substreams/node
```

**⚠️Warning:** This package is native [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules). If your project uses CommonJS, you'll have to [convert to ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) or use the [dynamic `import()`](https://v8.dev/features/dynamic-import) function. Please don't open issues for questions regarding CommonJS / ESM.

## [Examples](/examples)

- [EventEmitters](/examples/event-events)
- [Node](/examples/event-node)

```typescript
import { createRegistry, createRequest } from "@substreams/core";
import { BlockEmitter, createDefaultTransport, readFileSyncSubstream } from "@substreams/node";

// auth API token
// https://app.streamingfast.io/
if (!process.env.SUBSTREAMS_API_TOKEN) {
  throw new Error("SUBSTREAMS_API_TOKEN is require");
}

const token = process.env.SUBSTREAMS_API_TOKEN;
const baseUrl = "https://mainnet.eth.streamingfast.io:443";

// User parameters
const manifest = "./examples/subtivity-ethereum.spkg";
const outputModule = "map_block_stats";
const startBlockNum = 17381140;
const stopBlockNum = "+3";

// Read Substream
const substreamPackage = readFileSyncSubstream(manifest);

// Connect Transport
const registry = createRegistry(substreamPackage);
const transport = createDefaultTransport(baseUrl, token, registry);
const request = createRequest({
  substreamPackage,
  outputModule,
  startBlockNum,
  stopBlockNum,
  productionMode: true,
});

// NodeJS Events
const emitter = new BlockEmitter(transport, request, registry);

// Stream Blocks
emitter.on("anyMessage", (message, state) => {
  console.dir(message);
  console.dir(state);
});

emitter.start();
```