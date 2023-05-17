import { createGrpcTransport } from "@bufbuild/connect-node";
import { BlockScopedData, Clock, MapModuleOutput, Module_Input_Params, Modules, StoreModuleOutput, createAuthInterceptor, createRegistry, createRequest, createSubstream, streamBlocks, unpackMapOutput } from "@substreams/core";
import { IEnumTypeRegistry, IMessageTypeRegistry, IServiceTypeRegistry } from "@bufbuild/protobuf/dist/types/type-registry";
export type Registry = IMessageTypeRegistry & IEnumTypeRegistry & IServiceTypeRegistry;

// Utils (to move in Core)
import { parseStopBlock, calculateHeadBlockTimeDrift, timeout, unpack, parseBlockData, decode} from './utils.js';
import { getTypeName } from './utils.js';
export * from "./utils.js";

// Defaults (to move in Core)
export const DEFAULT_HOST = "https://mainnet.eth.streamingfast.io:443";
export const DEFAULT_AUTH = "https://auth.streamingfast.io/v1/auth/issue";
export const DEFAULT_IPFS = "https://ipfs.pinax.network/ipfs/";

// types
import { parseAuthorization } from './authorization.js';
import EventEmitter from "events";
import TypedEventEmitter from "typed-emitter";

type MessageEvents = {
    block: (block: BlockScopedData) => void;
    clock: (clock: Clock) => void;
    anyMessage: (message: any, clock: Clock, typeName: string) => void;
    cursor: (cursor: string, clock: Clock) => void;
    start: (cursor: string, clock: Clock) => void;
    end: (cursor: string, clock: Clock) => void;
    head_block_time_drift: (seconds: number, clock: Clock) => void;
    output: (output: MapModuleOutput, clock: Clock) => void;
    debugStoreOutputs: (output: StoreModuleOutput[], clock: Clock) => void;
    debugMapOutputs: (output: MapModuleOutput[], clock: Clock) => void;
    finalBlockHeight: (block_height: bigint, clock: Clock) => void;
}

export class Substreams extends (EventEmitter as new () => TypedEventEmitter<MessageEvents>) {
    // configs
    public host = DEFAULT_HOST;
    public auth = DEFAULT_AUTH;
    public startBlockNum?: bigint;
    public stopBlockNum?: bigint;
    public outputModule: string;
    public cursor?: string;
    public startCursor?: string;
    public irreversibilityCondition?: string;
    public finalBlocksOnly?: boolean;
    public initialStoreSnapshotForModules?: string[];
    public debugInitialStoreSnapshotForModules?: string[];
    public productionMode = true;
    public modules: Modules;
    public registry: Registry;
    public spkg: Uint8Array;
    // public transport: Transport;
    public authorization = "";
    // public callOptions?: CallOptions;

    private stopped = false;

    constructor(spkg: Uint8Array, outputModule: string, options: {
        host?: string,
        auth?: string,
        startBlockNum?: bigint,
        stopBlockNum?: bigint,
        authorization?: string,
        startCursor?: string,
        finalBlocksOnly?: boolean,
        irreversibilityCondition?: string;
        productionMode?: boolean;
        initialStoreSnapshotForModules?: string[],
        debugInitialStoreSnapshotForModules?: string[],
        // callOptions?: CallOptions,
    } = {}) {
        super();
        this.spkg = spkg;
        this.outputModule = outputModule;
        // this.startBlockNum = options.startBlockNum ?? "0";
        // this.stopBlockNum = parseStopBlock(this.startBlockNum, options.stopBlockNum);
        this.startBlockNum = options.startBlockNum;
        this.stopBlockNum = options.stopBlockNum;
        this.startCursor = options.startCursor;
        this.irreversibilityCondition = options.irreversibilityCondition;
        this.finalBlocksOnly = options.finalBlocksOnly;
        this.initialStoreSnapshotForModules = options.initialStoreSnapshotForModules;
        this.debugInitialStoreSnapshotForModules = options.debugInitialStoreSnapshotForModules;
        this.productionMode = options.productionMode ?? false;
        this.host = options.host ?? DEFAULT_HOST;
        this.auth = options.auth ?? DEFAULT_AUTH;
        this.authorization = options.authorization ?? "";
        // this.callOptions = options.callOptions;

        // unpack spkg
        const { modules, registry } = unpack(spkg);
        this.modules = modules;
        this.registry = registry;

        // Validate input
        if ( this.startBlockNum ) {
            const startBlockNum = Number(this.startBlockNum);
            if ( !Number.isInteger(startBlockNum)) throw new Error("startBlockNum must be an integer");
        }
    }

    public stop() {
        this.stopped = true;
    }

    public param(value: string, moduleName?: string) {
        if ( !moduleName ) moduleName = this.outputModule;
        const module = this.modules.modules.find(m => m.name === moduleName);
        if ( !module ) throw new Error(`Module ${moduleName} not found`);
        const module_input = module.inputs.find(i => i.input.case === 'params');
        if ( !module_input ) throw new Error(`Module ${moduleName} does not have a params input`);
        module_input.input.value = new Module_Input_Params({value});
    }

    public params(params: {[moduleName: string]: string}) {
        for ( const [moduleName, value] of Object.entries(params) ) {
            this.param(value, moduleName);
        }
    }

    public async start(delaySeconds?: number|string) {
        this.stopped = false;
        if ( delaySeconds ) await timeout(Number(delaySeconds) * 1000);

        // Authenticate API server key
        // no action if Substreams API token is provided
        if ( this.authorization ) {
            this.authorization = await parseAuthorization(this.authorization, this.auth);
        }
        // create transport
        const transport = createGrpcTransport({
            baseUrl: "https://api.streamingfast.io",
            httpVersion: "2",
            interceptors: [createAuthInterceptor(this.authorization)],
            jsonOptions: {
              typeRegistry: this.registry,
            },
        });

        const request = createRequest({
            substreamPackage: createSubstream(this.spkg),
            outputModule: this.outputModule,
            productionMode: true,
            startBlockNum: this.startBlockNum,
            stopBlockNum: this.stopBlockNum,
        });

        // Send Substream Data to Adapter
        let last_cursor: string = '';
        let last_clock = {} as Clock;
        for await (const item of streamBlocks(transport, request)) {
            if ( this.stopped ) break;
            const block = parseBlockData(item.response);

            // skip if block data if not present
            if ( !block ) continue;
            if ( !block.clock ) continue;
            const { output, clock, finalBlockHeight } = block;

            if ( !last_cursor ) this.emit("start", block.cursor, clock);
            this.emit("block", block);
            this.emit("clock", clock);
            this.emit("head_block_time_drift", calculateHeadBlockTimeDrift(clock), clock);

            // Map Output
            if ( output ) {
                this.emit("output", output, clock);
                const typeName = getTypeName(output);
                const decoded = decode(output, this.registry, typeName);
                if (!decoded) continue;
                this.emit("anyMessage", decoded, clock, typeName);
            }
            // Debug
            this.emit("debugStoreOutputs", block.debugStoreOutputs, clock);
            this.emit("debugMapOutputs", block.debugMapOutputs, clock);

            // Final
            this.emit("cursor", block.cursor, clock);
            this.emit("finalBlockHeight", finalBlockHeight, clock);
            last_cursor = block.cursor;
            last_clock = clock;
        }
        this.emit("end", last_cursor, last_clock);
    }
}