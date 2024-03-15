import { createRegistry, createRequest, applyParams } from "@substreams/core";
import { readPackage } from "@substreams/manifest";
import { BlockEmitter } from "@substreams/node";
import { createNodeTransport } from "@substreams/node/createNodeTransport";
import { APIClient, Serializer } from "@wharfkit/antelope";

// auth API token
// https://app.streamingfast.io/
// https://app.pinax.network/
if (!process.env.SUBSTREAMS_API_KEY) {
  throw new Error("SUBSTREAMS_API_KEY is require");
}
const token = process.env.SUBSTREAMS_API_KEY;

// RPC API Client
const contract = "danchorsmart";
const rpc = new APIClient({ url: "https://eos.api.eosnation.io" });
const abi = (await rpc.v1.chain.get_abi(contract)).abi;
if ( !abi ) throw new Error("ABI not found");

// User parameters
const baseUrl = "https://eos.substreams.pinax.network:443";
const manifest = "https://github.com/pinax-network/substreams/releases/download/common-v0.7.0/common-v0.7.0.spkg";
const outputModule = "map_db_ops";
const params = `map_db_ops=contract=${contract}`
const startBlockNum = 344396356;
const stopBlockNum = `+${60 * 86400 * 2}`; // +60 days (2 blocks per second)

// Read Substream
const substreamPackage = await readPackage(manifest);
if (!substreamPackage.modules) {
  throw new Error("No modules found in substream package");
}
applyParams([params], substreamPackage.modules.modules);

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

function decode_table(dbOp, abi) {
  let type = null;
  for ( const struct of abi.tables ) {
    if ( struct.name === dbOp.tableName ) {
      type = struct.type;
    }
  }
  if ( !type ) return null;
  return {
    ...dbOp,
    oldData: decode_data(dbOp.oldData, abi, type),
    newData: decode_data(dbOp.newData, abi, type),
  };
}

function decode_data(arrayBuffer, abi, type) {
  if ( !arrayBuffer) return null;
  const data = Buffer.from(arrayBuffer, "base64").toString("hex");
  const decoded = Serializer.decode({data, abi, type});
  const values = {};
  for ( const [key, value] of Object.entries(decoded) ) {
    values[key] = JSON.parse(JSON.stringify(value));
  }
  return values;
}

// Stream Blocks
emitter.on("anyMessage", (message, cursor, clock) => {
  const block_num = Number(clock.number);
  const timestamp = clock.timestamp.toDate();
  const seconds = Number(clock.timestamp.seconds);
  for ( const dbOp of message.dbOps ?? [] ) {
    if ( !dbOp.newData ) continue;
    const data = decode_table(dbOp, abi);
    if ( !data) continue;
    console.log({...data, block_num, timestamp, seconds });
  }
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
