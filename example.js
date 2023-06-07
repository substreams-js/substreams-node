import { createRegistry, createRequest, fetchSubstream } from "@substreams/core";
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
const substreamPackage = await fetchSubstream(manifest);

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
emitter.on("anyMessage", (message, cursor, clock) => {
  console.dir(message);
  console.dir(cursor);
  console.dir(clock);
});

emitter.start(500); // 500ms delay start
