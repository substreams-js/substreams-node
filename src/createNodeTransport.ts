import type { IMessageTypeRegistry } from "@bufbuild/protobuf";
import { Transport } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-node";
import { createInterceptors } from "./interceptors.js";

export function createNodeTransport(baseUrl: string, token: string, registry: IMessageTypeRegistry, headers?: Headers): Transport {
  return createGrpcWebTransport({
    baseUrl,
    httpVersion: "2",
    interceptors: createInterceptors(token, headers),
    jsonOptions: {
      typeRegistry: registry,
    },
  });
}

export default createNodeTransport;