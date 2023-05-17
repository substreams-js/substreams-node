import { Substreams, download } from "./src/index";

// User parameters
const url = "https://github.com/pinax-network/subtivity-substreams/releases/download/v0.2.1/subtivity-ethereum-v0.2.1.spkg";
const outputModule = "prom_out";
const startBlockNum = 12292922n;
const stopBlockNum = 12292925n;

// download Substream from IPFS
const spkg = await download(url);

// Initialize Substreams
const substreams = new Substreams(spkg, outputModule, {
    startBlockNum,
    stopBlockNum,
    authorization: process.env.SUBSTREAMS_API_TOKEN
});

// first block received
substreams.on("start", (cursor, clock) => {
    console.log({status: "start", cursor, clock});
});

// stream of decoded MapOutputs
substreams.on("anyMessage", (message) => {
    console.log({message});
});

// end of stream
substreams.on("end", (cursor, clock) => {
    console.log({status: "end", cursor, clock});
});

// start streaming Substream
substreams.start();