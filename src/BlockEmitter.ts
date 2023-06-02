import { type CallOptions, type Transport, createPromiseClient } from "@bufbuild/connect";
import { AnyMessage, IMessageTypeRegistry, JsonObject, Message } from "@bufbuild/protobuf";
import { State, createStateTracker, isEmptyMessage, unpackMapOutput } from "@substreams/core";
import {
  BlockScopedData,
  BlockUndoSignal,
  Clock,
  InitialSnapshotComplete,
  InitialSnapshotData,
  ModulesProgress,
  type Request,
  Response,
  SessionInit,
  Stream,
} from "@substreams/core/proto";

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
  // block
  block: [block: BlockScopedData];
  session: [session: SessionInit, state: State];
  progress: [progress: ModulesProgress, state: State];
  undo: [undo: BlockUndoSignal, state: State];

  // debug (only available in development mode)
  debugSnapshotData: [undo: InitialSnapshotData, state: State];
  debugSnapshotComplete: [undo: InitialSnapshotComplete, state: State];

  // response
  response: [response: Response, state: State];
  cursor: [cursor: string, clock: Clock];
  output: [message: Message<AnyMessage>, cursor: string, clock: Clock];
  anyMessage: [message: JsonObject, cursor: string, clock: Clock];
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

      switch (response.message.case) {
        case "blockScopedData": {
          const block = response.message.value;
          this.emit("block", block);
          if (block.clock) {
            this.emit("cursor", block.cursor, block.clock);
            const output = unpackMapOutput(response, this.registry);
            if (output) {
              this.emit("output", output, block.cursor, block.clock);
              if (!isEmptyMessage(output)) {
                const message = output.toJson({ typeRegistry: this.registry });
                this.emit("anyMessage", message as JsonObject, block.cursor, block.clock);
              }
            }
          }
          break;
        }
        case "progress": {
          this.emit("progress", response.message.value, state);
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
