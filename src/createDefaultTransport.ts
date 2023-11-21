import { createHeadersInterceptor } from "./createHeadersInterceptor.js";
import type { IMessageTypeRegistry } from "@bufbuild/protobuf";
import { Transport } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { createAuthInterceptor } from "@substreams/core";

export function createDefaultTransport(baseUrl: string, token: string, registry: IMessageTypeRegistry, headers?: Headers): Transport {
  const interceptors = [createHeadersInterceptor(headers)];
  if (token) {
    interceptors.push(createAuthInterceptor(token));
  }
  return createGrpcWebTransport({
    baseUrl,
    interceptors,
    jsonOptions: {
      typeRegistry: registry,
    },
  });
}
