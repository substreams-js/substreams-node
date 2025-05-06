import { createRegistry, createRequest, applyParams } from "@substreams/core";
import { readPackage } from "@substreams/manifest";
import { BlockEmitter } from "../src/BlockEmitter";
import { createNodeTransport } from "../src/createNodeTransport";

// auth API token
// https://app.streamingfast.io/
// https://app.pinax.network/
if (!process.env.SUBSTREAMS_API_KEY) {
  throw new Error("SUBSTREAMS_API_KEY is require");
}

const token = process.env.SUBSTREAMS_API_KEY;
const baseUrl = "https://eos.substreams.pinax.network:443";

// User parameters
const manifest = "https://github.com/pinax-network/substreams/releases/download/blocks-v0.1.0/blocks-v0.1.0.spkg";
const outputModule = "map_blocks";
const startBlockNum = -10;
const productionMode = true;

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
  productionMode,
});

// NodeJS Events
const emitter = new BlockEmitter(transport, request, registry);

// Session Trace ID
emitter.on("session", (session) => {
  console.dir(session);
});

emitter.on("clock", clock => {
  console.log(clock);
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