import type { IMessageTypeRegistry } from "@bufbuild/protobuf";
import { Transport } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { createAuthInterceptor } from "@substreams/core";
import { createHeadersInterceptor } from "./createHeadersInterceptor.js";

export function createDefaultTransport(baseUrl: string, token: string, registry: IMessageTypeRegistry, headers?: Headers): Transport {
  return createGrpcWebTransport({
    baseUrl,
    interceptors: [createHeadersInterceptor(headers), createAuthInterceptor(token)],
    jsonOptions: {
      typeRegistry: registry,
    },
  });
}
