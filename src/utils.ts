import { BlockScopedData, BlockUndoSignal, ModulesProgress, Response, State } from "@substreams/core";

export function parseBlockData(response: Response) {
  if (response.message.case !== "blockScopedData") {
    return;
  }
  return response.message.value as BlockScopedData;
}

export function parseModulesProgress(response: Response) {
  if (response.message.case !== "progress") {
    return;
  }
  return response.message.value as ModulesProgress;
}

export function parseBlockUndoSignal(response: Response) {
  if (response.message.case !== "blockUndoSignal") {
    return;
  }
  return response.message.value as BlockUndoSignal;
}

export function calculateHeadBlockTimeDrift(state: State) {
  if (!state.timestamp) {
    return -1;
  }
  const seconds = state.timestamp.getSeconds() || 0;
  const current = Math.floor(new Date().valueOf() / 1000);
  return current - seconds;
}
