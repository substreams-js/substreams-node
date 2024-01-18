import fs from "fs";
import { createModuleHashHex, createRegistry, createRequest } from "@substreams/core";
import { readPackage } from "@substreams/manifest";
import { BlockEmitter, createNodeTransport } from "@substreams/node";
import LogUpdate from "log-update";

// auth API token
// https://app.streamingfast.io/
// https://app.pinax.network/
if (!process.env.SUBSTREAMS_API_TOKEN) {
  throw new Error("SUBSTREAMS_API_TOKEN is require");
}
const token = process.env.SUBSTREAMS_API_TOKEN;

// User parameters
const baseUrl = "https://eos.substreams.pinax.network:443";
const manifest = "https://github.com/pinax-network/substreams/releases/download/common-v0.7.0/common-v0.7.0.spkg";
const outputModule = "map_transaction_traces";
const startBlockNum = 345801951;

// Read Substream
const substreamPackage = await readPackage(manifest);
if (!substreamPackage.modules) {
  throw new Error("No modules found in substream package");
}
const moduleHash = await createModuleHashHex(substreamPackage.modules, outputModule);

// Cursor
const filename = `${moduleHash}-${startBlockNum}`
const startCursor = fs.existsSync(`${filename}.cursor`) ? fs.readFileSync(`${filename}.cursor`, "utf8") : undefined;

// Connect Transport
const headers = new Headers({ "User-Agent": "@substreams/node" });
const registry = createRegistry(substreamPackage);
const transport = createNodeTransport(baseUrl, token, registry, headers);
const request = createRequest({
  substreamPackage,
  outputModule,
  startBlockNum,
  startCursor,
});

// NodeJS Events
const emitter = new BlockEmitter(transport, request, registry);

// Session Trace ID
emitter.on("session", (session) => {
  console.dir(session);
});

// Filter data
const ignore = new Set(["eosiopowcoin"])
let total_writes = 0;

// CSV writer (append)
const exists = fs.existsSync(`${filename}.csv`);
const writer = fs.createWriteStream(`${filename}.csv`, {flags: "a"});
if ( !exists ) writer.write("block_num,timestamp,transaction_id,from,to,quantity,memo\n");


// Stream Blocks
emitter.on("anyMessage", (message, cursor, clock) => {
  // block header
  const block_num = clock.number;
  const timestamp = clock.timestamp;

  LogUpdate(`block_num: ${block_num} timestamp: ${timestamp.seconds} total_writes: ${total_writes}`);

  // action traces
  for ( const transactionTrace of message?.transactionTraces ?? []) {
    for ( const actionTrace of transactionTrace?.actionTraces ?? []) {
      const {account, name, jsonData} = actionTrace.action;
      if ( account != actionTrace.receiver ) continue; // only handle inline actions by the receiver
      if ( account === "eosio.token" && name === "transfer" ) {

        // eosio.token::transfer
        const {from, to, quantity, memo} = JSON.parse(jsonData);
        if ( ignore.has(from) || ignore.has(to)) continue;
        writer.write([block_num, timestamp.seconds, transactionTrace.id, from, to, quantity, memo].join(",") + "\n");
        total_writes += 1;
      }
    }
  }

  // save cursor
  fs.writeFileSync(`${filename}.cursor`, cursor);
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
