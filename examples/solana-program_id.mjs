import { createRegistry, createRequest, applyParams } from "@substreams/core";
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
const baseUrl = "https://solana.substreams.pinax.network:443";

// User parameters
const manifest = "https://github.com/pinax-network/substreams-raw-blocks/releases/download/solana-v1.0.1/raw-blocks-solana-v1.0.1.spkg";
// const outputModule = "map_events";
const outputModule = "map_events_with_votes";
const startBlockNum = "291246587";
const stopBlockNum = "291246588";

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

// Stream Blocks
emitter.on("anyMessage", (message) => {
  let program_ids = new Set();
  let block = message.blocks[0]
  for ( const instructionCall of message.instructionCalls ) {
    program_ids.add(instructionCall.programId);
    // console.log(instructionCall.programId);
    // console.log(instructionCall.txId, "-", instructionCall.programId)
  }
  console.log(program_ids);
  // console.log({
  //   block: block.height,
  //   program_ids: program_ids.size,
  //   transactions: block.totalTransactions
  // });
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
