import { EventEmitter } from "node:events";
import type { CallOptions, Transport } from "@bufbuild/connect";
import { createPromiseClient } from "@bufbuild/connect";
import { AnyMessage, IMessageTypeRegistry, JsonObject, Message } from "@bufbuild/protobuf";
import { Progress, createStateTracker, isEmptyMessage, unpackMapOutput } from "@substreams/core";
import type {
  BlockScopedData,
  BlockUndoSignal,
  Clock,
  InitialSnapshotComplete,
  InitialSnapshotData,
  ModulesProgress,
  Request,
  Response,
  SessionInit,
} from "@substreams/core/proto";
import { Stream } from "@substreams/core/proto";

export class TypedEventEmitter<TEvents extends Record<string, any>> {
  private emitter = new EventEmitter();

  emit<TEventName extends keyof TEvents & string>(eventName: TEventName, ...eventArg: TEvents[TEventName]) {
    return this.emitter.emit(eventName, ...(eventArg as []));
  }

  on<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void,
  ) {
    return this.emitter.on(eventName, handler as any);
  }

  once<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void,
  ) {
    return this.emitter.once(eventName, handler as any);
  }

  removeListener<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void,
  ) {
    return this.emitter.removeListener(eventName, handler as any);
  }

  removeAllListeners<TEventName extends keyof TEvents & string>(eventName?: TEventName) {
    if (eventName) {
      return this.emitter.removeAllListeners(eventName);
    }
    return this.emitter.removeAllListeners();
  }

  eventNames() {
    return this.emitter.eventNames();
  }

  getMaxListeners() {
    return this.emitter.getMaxListeners();
  }

  listenerCount<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void,
  ) {
    return this.emitter.listenerCount(eventName, handler as any);
  }

  off<TEventName extends keyof TEvents & string>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void,
  ) {
    return this.emitter.off(eventName, handler as any);
  }
}

/**
 * A map of event names to argument tuples
 */
type LocalEventTypes = {
  // block
  block: [block: BlockScopedData];
  session: [session: SessionInit, state: Progress];
  progress: [progress: ModulesProgress, state: Progress];
  undo: [undo: BlockUndoSignal, state: Progress];

  // debug (only available in development mode)
  debugSnapshotData: [undo: InitialSnapshotData, state: Progress];
  debugSnapshotComplete: [undo: InitialSnapshotComplete, state: Progress];

  // response
  response: [response: Response, state: Progress];
  cursor: [cursor: string, clock: Clock];
  clock: [clock: Clock];
  output: [message: Message<AnyMessage>, cursor: string, clock: Clock];
  anyMessage: [message: JsonObject, cursor: string, clock: Clock];
};

export class BlockEmitter extends TypedEventEmitter<LocalEventTypes> {
  public transport: Transport;
  public request: Request;
  public registry: IMessageTypeRegistry;
  public options?: CallOptions;
  private stopped = false;

  constructor(transport: Transport, request: Request, registry: IMessageTypeRegistry, options?: CallOptions) {
    super();
    this.transport = transport;
    this.request = request;
    this.registry = registry;
    this.options = options;
  }

  /**
   * Stop streaming blocks
   */
  public stop() {
    this.stopped = true;
  }

  /**
   * Start streaming blocks
   */
  public async start() {
    this.stopped = false;
    const track = createStateTracker();
    const client = createPromiseClient(Stream, this.transport);

    for await (const response of client.blocks(this.request, this.options)) {
      if (this.stopped) {
        break;
      }
      const state = track(response);
      this.emit("response", response, state);

      switch (response.message.case) {
        case "blockScopedData": {
          const block = response.message.value;
          this.emit("block", block);
          if (block.clock) {
            const output = unpackMapOutput(response, this.registry);
            if (output) {
              this.emit("output", output, block.cursor, block.clock);
              if (!isEmptyMessage(output)) {
                const message = output.toJson({ typeRegistry: this.registry });
                this.emit("anyMessage", message as JsonObject, block.cursor, block.clock);
              }
            }
            this.emit("clock", block.clock);
            this.emit("cursor", block.cursor, block.clock);
          }
          break;
        }
        case "progress": {
          this.emit("progress", response.message.value, state);
          break;
        }
        case "session": {
          this.emit("session", response.message.value, state);
          break;
        }
        case "blockUndoSignal": {
          this.emit("undo", response.message.value, state);
          break;
        }
        case "debugSnapshotData": {
          this.emit("debugSnapshotData", response.message.value, state);
          break;
        }
        case "debugSnapshotComplete": {
          this.emit("debugSnapshotComplete", response.message.value, state);
          break;
        }
      }
    }
  }
}
