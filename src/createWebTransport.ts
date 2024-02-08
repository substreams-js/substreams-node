import type { IMessageTypeRegistry } from "@bufbuild/protobuf";
import { Transport } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { createInterceptors } from "./interceptors.js";

export function createWebTransport(baseUrl: string, token: string, registry: IMessageTypeRegistry, headers?: Headers): Transport {
  return createGrpcWebTransport({
    baseUrl,
    interceptors: createInterceptors(token, headers),
    jsonOptions: {
      typeRegistry: registry,
    },
  });
}

export default createWebTransport;