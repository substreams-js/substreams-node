import { createHeadersInterceptor } from "./createHeadersInterceptor.js";
import { Transport } from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";
import type { IMessageTypeRegistry } from "@bufbuild/protobuf";
import { createAuthInterceptor } from "@substreams/core";

export function createDefaultTransport(
  baseUrl: string,
  token: string,
  registry: IMessageTypeRegistry,
  headers?: Headers,
): Transport {
  return createGrpcTransport({
    baseUrl,
    httpVersion: "2",
    interceptors: [createHeadersInterceptor(headers), createAuthInterceptor(token)],
    jsonOptions: {
      typeRegistry: registry,
    },
  });
}
