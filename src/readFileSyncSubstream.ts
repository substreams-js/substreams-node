import { createSubstream } from "@substreams/core";
import fs from "node:fs";

export function readFileSyncSubstream(...args: Parameters<typeof fs.readFileSync>) {
  const buffer = fs.readFileSync(...args);
  if (typeof buffer === "string") {
    throw new Error("invalid read Buffer");
  }
  return createSubstream(new Uint8Array(buffer));
}
