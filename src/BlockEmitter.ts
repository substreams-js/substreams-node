import { AnyMessage, IMessageTypeRegistry, JsonObject, Message } from "@bufbuild/protobuf";
import type { CallOptions, Transport } from "@connectrpc/connect";
import { isEmptyMessage, streamBlocks, unpackMapOutput } from "@substreams/core";
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
import { EventEmitter } from "eventemitter3";

export class TypedEventEmitter<Events extends Record<string, any>> {
  private emitter = new EventEmitter();

  emit<EventName extends keyof Events & string>(eventName: EventName, ...eventArg: Events[EventName]) {
    return this.emitter.emit(eventName, ...(eventArg as []));
  }

  on<EventName extends keyof Events & string>(eventName: EventName, handler: (...eventArg: Events[EventName]) => void) {
    return this.emitter.on(eventName, handler as any);
  }

  once<EventName extends keyof Events & string>(eventName: EventName, handler: (...eventArg: Events[EventName]) => void) {
    return this.emitter.once(eventName, handler as any);
  }

  removeListener<EventName extends keyof Events & string>(eventName: EventName, handler: (...eventArg: Events[EventName]) => void) {
    return this.emitter.removeListener(eventName, handler as any);
  }

  removeAllListeners<EventName extends keyof Events & string>(eventName?: EventName) {
    if (eventName) {
      return this.emitter.removeAllListeners(eventName);
    }
    return this.emitter.removeAllListeners();
  }

  eventNames() {
    return this.emitter.eventNames();
  }

  listenerCount<EventName extends keyof Events & string>(eventName: EventName) {
    return this.emitter.listenerCount(eventName);
  }

  off<EventName extends keyof Events & string>(eventName: EventName, handler: (...eventArg: Events[EventName]) => void) {
    return this.emitter.off(eventName, handler as any);
  }
}

/**
 * A map of event names to argument tuples
 */
type LocalEventTypes = {
  // block
  block: [block: BlockScopedData];
  session: [session: SessionInit];
  progress: [progress: ModulesProgress];
  undo: [undo: BlockUndoSignal];

  // debug (only available in development mode)
  debugSnapshotData: [undo: InitialSnapshotData];
  debugSnapshotComplete: [undo: InitialSnapshotComplete];

  // response
  response: [response: Response];
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

    for await (const response of streamBlocks(this.transport, this.request, this.options)) {
      if (this.stopped) {
        break;
      }
      this.emit("response", response);

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
          this.emit("progress", response.message.value);
          break;
        }
        case "session": {
          this.emit("session", response.message.value);
          break;
        }
        case "blockUndoSignal": {
          this.emit("undo", response.message.value);
          break;
        }
        case "debugSnapshotData": {
          this.emit("debugSnapshotData", response.message.value);
          break;
        }
        case "debugSnapshotComplete": {
          this.emit("debugSnapshotComplete", response.message.value);
          break;
        }
      }
    }
  }
}
