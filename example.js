import { createModuleHashHex, createRegistry, createRequest } from "@substreams/core";
import { readPackage } from "@substreams/manifest";
import { BlockEmitter, createDefaultTransport } from "@substreams/node";

// auth API token
// https://app.streamingfast.io/
if (!process.env.SUBSTREAMS_API_TOKEN) {
  throw new Error("SUBSTREAMS_API_TOKEN is require");
}

const token = process.env.SUBSTREAMS_API_TOKEN;
const baseUrl = "https://mainnet.eth.streamingfast.io:443";

// User parameters
const manifest =
  "https://github.com/pinax-network/subtivity-substreams/releases/download/v0.2.3/subtivity-ethereum-v0.2.3.spkg";
const outputModule = "map_block_stats";
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
const headers = new Headers({ "User-Agent": "@substreams/node" });
const registry = createRegistry(substreamPackage);
const transport = createDefaultTransport(baseUrl, token, registry, headers);
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

await emitter.start();
console.log("✅ done");
