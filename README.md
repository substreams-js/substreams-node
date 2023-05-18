# `@substreams/node`

> Substreams for `Node.js`

## Install

```sh
npm install @substreams/node
```

**⚠️Warning:** This package is native [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules). If your project uses CommonJS, you'll have to [convert to ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) or use the [dynamic `import()`](https://v8.dev/features/dynamic-import) function. Please don't open issues for questions regarding CommonJS / ESM.

## Usage

```js
import { Substreams, download } from "@substreams/node";

// User parameters
const url = "https://github.com/streamingfast/substreams-ethereum-quickstart/releases/download/1.0.0/substreams-ethereum-quickstart-v1.0.0.spkg";
const outputModule = "map_block";
const startBlockNum = "12292922";
const stopBlockNum = "+10";

(async () => {
    // download Substream from IPFS
    const spkg = await download(url);

    // Initialize Substreams
    const substreams = new Substreams(spkg, outputModule, {
        startBlockNum,
        stopBlockNum,
        authorization: process.env.SUBSTREAMS_API_TOKEN
    });

    // first block received
    substreams.on("start", (cursor, clock) => {
        console.log({status: "start", cursor, clock});
    });

    // stream of decoded MapOutputs
    substreams.on("anyMessage", (message) => {
        console.log({message});
    });

    // end of stream
    substreams.on("end", (cursor, clock) => {
        console.log({status: "end", cursor, clock});
    });

    // start streaming Substream
    substreams.start();
})();
```