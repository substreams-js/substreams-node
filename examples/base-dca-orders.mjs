import { applyParams, createRegistry, createRequest } from "@substreams/core";
import { readPackage } from "@substreams/manifest";
import { BlockEmitter } from "../dist/index.js";
import { createNodeTransport } from "@substreams/node/createNodeTransport";

// auth API token
// https://app.streamingfast.io/
// https://app.pinax.network/
if (!process.env.SUBSTREAMS_API_KEY) {
  throw new Error("SUBSTREAMS_API_KEY is require");
}

const token = process.env.SUBSTREAMS_API_KEY;
const baseUrl = "https://base.substreams.pinax.network:443";

// User parameters
const CONTRACT_ADDRESS = "0xdCa01Cc53e085A32EadBe9E60a2EFb253D6f3b7B";
const manifest = "https://github.com/pinax-network/substreams-dca-dot-fun/releases/download/v0.1.3/clickhouse-dca-dot-fun-v0.1.3.spkg";
const outputModule = "db_out";
const params = [`dca_dot_fun:map_events=evt_addr:${CONTRACT_ADDRESS.toLocaleLowerCase()}`]
const startBlockNum = 32728291;
// const startBlockNum = -1; // -1 means latest block
const productionMode = true;

// Read Substream
const substreamPackage = await readPackage(manifest);
if (!substreamPackage.modules) {
  throw new Error("No modules found in substream package");
}
applyParams(params, substreamPackage.modules.modules);

// Connect Transport
const registry = createRegistry(substreamPackage);
const transport = createNodeTransport(baseUrl, token, registry);
const request = createRequest({
  substreamPackage,
  outputModule,
  startBlockNum,
  // stopBlockNum,
  productionMode,
});

// NodeJS Events
const emitter = new BlockEmitter(transport, request, registry);

// Session Trace ID
emitter.on("session", (session) => {
  console.dir(session);
});

// Stream Blocks
emitter.on("anyMessage", (message, cursor, clock) => {
  for (const change of message.tableChanges || []) {
    if (change.table == "blocks") { continue; } // skip blocks table

    // Group data into JSON object
    const data = {};
    for ( const field of change.fields || [] ) {
      data[field.name] = field.newValue;
    }
    console.log({
      table: change.table,
      data
    })
  }
});

emitter.on("clock", clock => {
  console.log({ block: clock.number, timestamp: clock.timestamp.toDate() });
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