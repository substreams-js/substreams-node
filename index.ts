import { createGrpcTransport } from "@bufbuild/connect-node";
import type { IMessageTypeRegistry } from "@bufbuild/protobuf";
import { createAuthInterceptor, createSubstream } from "@substreams/core";
import fs from "node:fs";

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

export function readFileSyncSubstream(...args: Parameters<typeof fs.readFileSync>) {
  const buffer = fs.readFileSync(...args);
  if (typeof buffer === "string") {
    throw new Error("invalid read Buffer");
  }
  return createSubstream(new Uint8Array(buffer));
}
