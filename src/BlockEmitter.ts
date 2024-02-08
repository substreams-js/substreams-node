import { AnyMessage, IMessageTypeRegistry, JsonObject, Message } from "@bufbuild/protobuf";
import { type CallOptions, type ConnectError, type Transport, createCallbackClient } from "@connectrpc/connect";
import { isEmptyMessage, unpackMapOutput } from "@substreams/core";
import {
  BlockScopedData,
  BlockUndoSignal,
  Clock,
  Error as FatalError,
  InitialSnapshotComplete,
  InitialSnapshotData,
  ModulesProgress,
  Request,
  Response,
  SessionInit,
  Stream,
} from "@substreams/core/proto";
import { EventEmitter } from "eventemitter3";

export type CancelFn = () => void;

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
export type LocalEventTypes = {
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

  // error
  close: [error?: ConnectError];
  fatalError: [error: FatalError];
};

export class BlockEmitter extends TypedEventEmitter<LocalEventTypes> {
  public transport: Transport;
  public request: Request;
  public registry: IMessageTypeRegistry;
  public options?: CallOptions;
  public cancelFn?: CancelFn;

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
  public stop(): void {
    if (this.cancelFn) {
      this.cancelFn();
    } else {
      throw new Error("BlockEmitter.stop() called before BlockEmitter.start()");
    }
  }

  /**
   * Start streaming blocks
   */
  public start(): CancelFn {
    const closeCallback = (error?: ConnectError) => {
      this.emit("close", error);
      this.cancelFn = undefined;
    };

    const messageCallback = (response: Response) => {
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
        case "fatalError": {
          this.emit("fatalError", response.message.value);
          break;
        }
      }
    };
    const client = createCallbackClient(Stream, this.transport);
    this.cancelFn = client.blocks(this.request, messageCallback, closeCallback, this.options);
    return this.cancelFn;
  }
}
