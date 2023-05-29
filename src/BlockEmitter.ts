import { type CallOptions, type Transport, createPromiseClient } from "@bufbuild/connect";
import { type Request, Response, State, Stream, createStateTracker } from "@substreams/core";
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
  block: [{ state: State; response: Response }];
};

export class BlockEmitter extends TypedEventEmitter<LocalEventTypes> {
  public transport: Transport;
  public request: Request;
  public options?: CallOptions;

  constructor(transport: Transport, request: Request, options?: CallOptions) {
    super();
    this.transport = transport;
    this.request = request;
    this.options = options;
  }
  public async start() {
    const track = createStateTracker(this.request);
    const client = createPromiseClient(Stream, this.transport);
    for await (const response of client.blocks(this.request, this.options)) {
      const state = track(response);
      this.emit("block", { state, response });
    }
  }
}
