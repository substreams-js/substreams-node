import { createDefaultTransport, readFileSyncSubstream } from "../../index.js";
import { createRegistry, createRequest, isEmptyMessage, streamBlocks, unpackMapOutput } from "@substreams/core";

// auth API token
// https://app.streamingfast.io/
if (!process.env.SUBSTREAMS_API_TOKEN) {
  throw new Error("SUBSTREAMS_API_TOKEN is require");
}
const token = process.env.SUBSTREAMS_API_TOKEN;
const baseUrl = "https://mainnet.eth.streamingfast.io:443";

// User parameters
const filepath = "../subtivity-ethereum.spkg";
const outputModule = "prom_out";
const startBlockNum = 12292922n;
const stopBlockNum = "+3";

// Download Substream
(async () => {
  const substreamPackage = readFileSyncSubstream(filepath);

  // Connect Transport
  const registry = createRegistry(substreamPackage);
  const transport = createDefaultTransport(baseUrl, token, registry);
  const request = createRequest({
    substreamPackage,
    outputModule,
    productionMode: true,
    startBlockNum,
    stopBlockNum,
  });

  // Stream Blocks
  for await (const { response, state } of streamBlocks(transport, request)) {
    const output = unpackMapOutput(response, registry);
    if (output && !isEmptyMessage(output)) {
      console.dir(output.toJson({ typeRegistry: registry }));
    }
    console.dir(state);
  }
})();
