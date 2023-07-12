import { Transport } from "@bufbuild/connect";
import { createGrpcTransport } from "@bufbuild/connect-node";
import type { IMessageTypeRegistry } from "@bufbuild/protobuf";
import { createAuthInterceptor } from "@substreams/core";

export function createDefaultTransport(
  baseUrl: string,
  token?: string,
  typeRegistry?: IMessageTypeRegistry,
): Transport {
  return createGrpcTransport({
    baseUrl,
    httpVersion: "2",
    interceptors: token ? [createAuthInterceptor(token)] : undefined,
    jsonOptions: {
      typeRegistry,
    },
  });
}
