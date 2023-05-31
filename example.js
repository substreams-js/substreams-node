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
