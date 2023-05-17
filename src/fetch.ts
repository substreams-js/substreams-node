import { createSubstream } from "@substreams/core";

export async function fetchSubstream(url: string) {
  const array = await download(url);
  return createSubstream(array);
}

export async function download(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  return blob.arrayBuffer();
}