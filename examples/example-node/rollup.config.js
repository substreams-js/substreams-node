import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  input: "index.ts",
  output: {
    file: "out/bundle.js",
    format: "cjs",
  },
  plugins: [nodeResolve({ extensions: [".ts"] })],
};
