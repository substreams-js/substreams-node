import { createRegistry, createRequest } from "@substreams/core";
import { readPackage } from "@substreams/manifest";
import { BlockEmitter } from "@substreams/node";
import { createNodeTransport } from "@substreams/node/createNodeTransport";

// auth API token
// https://app.streamingfast.io/
// https://app.pinax.network/
if (!process.env.SUBSTREAMS_API_KEY) {
  throw new Error("SUBSTREAMS_API_KEY is require");
}

const token = process.env.SUBSTREAMS_API_KEY;
const baseUrl = "https://goerli.substreams.pinax.network:443";

// User parameters
const manifest = "https://github.com/pinax-network/substreams/releases/download/blobs-v0.2.0/eth-blobs-v0.2.0.spkg";
const outputModule = "map_blobs";
const startBlockNum = 7671800;
const stopBlockNum = "+10";

// Read Substream
const substreamPackage = await readPackage(manifest);
if (!substreamPackage.modules) {
  throw new Error("No modules found in substream package");
}

// Connect Transport
const registry = createRegistry(substreamPackage);
const transport = createNodeTransport(baseUrl, token, registry);
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
emitter.start();