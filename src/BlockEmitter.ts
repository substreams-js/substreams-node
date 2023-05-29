import { parseBlockData, parseBlockUndoSignal, parseModulesProgress } from "./utils.js";
import { type CallOptions, type Transport, createPromiseClient } from "@bufbuild/connect";
import { IMessageTypeRegistry, JsonObject } from "@bufbuild/protobuf";
import {
  BlockScopedData,
  BlockUndoSignal,
  Clock,
  ModulesProgress,
  type Request,
  Response,
  State,
  Stream,
  createStateTracker,
  isEmptyMessage,
  unpackMapOutput,
} from "@substreams/core";
import { EventEmitter } from "node:events";

export class TypedEventEmitter<TEvents extends Record<string, any>> {
  private emitter = new EventEmitter();

  emit<TEventName extends keyof TEvents & string>(eventName: TEventName, ...eventArg: TEvents[TEventName]) {
    this.emitter.emit(eventName, ...(eventArg as []));
  }

  on<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void,
  ) {
    this.emitter.on(eventName, handler as any);
  }

  off<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void,
  ) {
    this.emitter.off(eventName, handler as any);
  }
}

/**
 * A map of event names to argument tuples
 */
type LocalEventTypes = {
  block: [block: BlockScopedData, state: State];
  response: [response: Response, state: State];
  cursor: [cursor: string, state: State];
  clock: [clock: Clock, state: State];
  anyMessage: [message: JsonObject, state: State];
  progress: [progress: ModulesProgress, state: State];
  blockUndoSignal: [undo: BlockUndoSignal, state: State];
};

export class BlockEmitter extends TypedEventEmitter<LocalEventTypes> {
  public transport: Transport;
  public request: Request;
  public registry: IMessageTypeRegistry;
  public options?: CallOptions;

  constructor(transport: Transport, request: Request, registry: IMessageTypeRegistry, options?: CallOptions) {
    super();
    this.transport = transport;
    this.request = request;
    this.registry = registry;
    this.options = options;
  }
  public async start() {
    const track = createStateTracker(this.request);
    const client = createPromiseClient(Stream, this.transport);

    for await (const response of client.blocks(this.request, this.options)) {
      const state = track(response);
      this.emit("response", response, state);

      const block = parseBlockData(response);
      if (block) {
        this.emit("block", block, state);
        this.emit("cursor", block.cursor, state);
        if (block.clock) {
          this.emit("clock", block.clock, state);
        }
      }

      const progress = parseModulesProgress(response);
      if (progress) {
        this.emit("progress", progress, state);
      }

      const blockUndoSignal = parseBlockUndoSignal(response);
      if (blockUndoSignal) {
        this.emit("blockUndoSignal", blockUndoSignal, state);
      }

      const output = unpackMapOutput(response, this.registry);
      if (output && !isEmptyMessage(output)) {
        const message = output.toJson({ typeRegistry: this.registry });
        this.emit("anyMessage", message as JsonObject, state);
      }
    }
  }
}
