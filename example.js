import { createModuleHashHex, createRegistry, createRequest } from "@substreams/core";
import { readPackage } from "@substreams/manifest";
import { BlockEmitter, createNodeTransport } from "@substreams/node";

// auth API token
// https://app.streamingfast.io/
// https://app.pinax.network/
if (!process.env.SUBSTREAMS_API_TOKEN) {
  throw new Error("SUBSTREAMS_API_TOKEN is require");
}

const token = process.env.SUBSTREAMS_API_TOKEN;
const baseUrl = "https://eth.substreams.pinax.network:443";

// User parameters
const manifest = "https://github.com/pinax-network/subtivity-substreams/releases/download/v0.2.3/subtivity-ethereum-v0.2.3.spkg";
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

console.log("✅ start");
console.time("🆗 close");
const cancel = emitter.start();
// cancel() to exit substreams session
