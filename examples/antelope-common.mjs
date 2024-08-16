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
const baseUrl = "https://eos.substreams.pinax.network:443";

// User parameters
const manifest = "https://spkg.io/pinax-network/antelope-common-v0.4.0.spkg";
const outputModule = "filtered_transactions";
const startBlockNum = -86400*4*2;
const productionMode = true;
const params = [`filtered_transactions=code:eosio && (action:buyram || action:sellram || action:ramtransfer)`]

// Read Substream
const substreamPackage = await readPackage(manifest);
if (!substreamPackage.modules) {
  throw new Error("No modules found in substream package");
}
applyParams(params, substreamPackage.modules.modules);

for ( const modules of substreamPackage.modules.modules ) {
  for ( const inputs of modules.inputs) {
    console.log(modules.name, inputs.input.value.value)
  }
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

emitter.on("progress", (progress) => {
  const runningJobs = progress.runningJobs.length;
  const { processedBytes } = progress
  const moduleStats = {};
  for ( const moduleStat of progress?.modulesStats ?? [] ) {
    moduleStats[moduleStat.name] = moduleStat.totalProcessedBlockCount;
  }
  // console.dir({ runningJobs, ...processedBytes, moduleStats });
});

emitter.on("clock", clock => {
  console.log(clock.number);
});

// Stream Blocks
emitter.on("anyMessage", (message, cursor, clock) => {
  // console.dir(message);
  // console.dir(cursor);
  // console.dir(clock);
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
