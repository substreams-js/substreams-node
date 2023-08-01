import { createHeadersInterceptor } from "./createHeadersInterceptor.js";
import { Transport } from "@bufbuild/connect";
import { createGrpcTransport } from "@bufbuild/connect-node";
import type { IMessageTypeRegistry } from "@bufbuild/protobuf";
import { createAuthInterceptor } from "@substreams/core";

export function createDefaultTransport(
  baseUrl: string,
  token: string,
  registry: IMessageTypeRegistry,
  headers?: any,
): Transport {
  return createGrpcTransport({
    baseUrl,
    httpVersion: "2",
    interceptors: [createAuthInterceptor(token), createHeadersInterceptor(headers)],
    jsonOptions: {
      typeRegistry: registry,
    },
  });
}
