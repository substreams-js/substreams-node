import { createRegistry, createRequest, applyParams } from "@substreams/core";
import { readPackage } from "@substreams/manifest";
import { BlockEmitter, createNodeTransport } from "@substreams/node";
import { APIClient, Bytes, Serializer } from "@wharfkit/antelope";

// auth API token
// https://app.streamingfast.io/
// https://app.pinax.network/
if (!process.env.SUBSTREAMS_API_TOKEN) {
  throw new Error("SUBSTREAMS_API_TOKEN is require");
}
const token = process.env.SUBSTREAMS_API_TOKEN;

// RPC API Client
const rpc = new APIClient({ url: "https://wax.api.eosnation.io" });
const abi = (await rpc.v1.chain.get_abi("eosio")).abi;
if ( !abi ) throw new Error("ABI not found");

// User parameters
const baseUrl = "https://wax.substreams.pinax.network:443";
const manifest = "https://github.com/pinax-network/substreams/releases/download/common-v0.7.0/common-v0.7.0.spkg";
const outputModule = "map_db_ops";
const params = "map_db_ops=contract=eosio&table=delband"
const startBlockNum = -10000;

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
});

// NodeJS Events
const emitter = new BlockEmitter(transport, request, registry);

// Session Trace ID
emitter.on("session", (session) => {
  console.dir(session);
});

// Stream Blocks
emitter.on("anyMessage", (message, cursor, clock) => {
  for ( const dbOp of message.dbOps ?? [] ) {
    if ( !dbOp.newData ) continue;
    const data = Buffer.from(dbOp.newData, "base64").toString("hex");
    const decoded = Serializer.decode({data, abi, type: "delegated_bandwidth"});
    const delband = {};
    for ( const [key, value] of Object.entries(decoded) ) {
      delband[key] = value.toJSON();
    }
    console.log(delband);
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
