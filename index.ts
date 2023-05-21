import { createGrpcTransport } from "@bufbuild/connect-node";
import type { IMessageTypeRegistry } from "@bufbuild/protobuf";
import { createAuthInterceptor } from "@substreams/core";

export function createDefaultTransport(baseUrl: string, token: string, registry: IMessageTypeRegistry) {
  return createGrpcTransport({
    baseUrl,
    httpVersion: "2",
    interceptors: [createAuthInterceptor(token)],
    jsonOptions: {
      typeRegistry: registry,
    },
  });
}
