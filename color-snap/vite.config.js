import { defineConfig } from "vite";
export default defineConfig({
  plugins: [],
  build: {
    lib: {
      entry: "src/index.js", // 工具库入口
      name: "color-snap", // 工具库名称
      fileName: (format) => `color-snap.${format}.js`, // 工具库名称
    },
  },
});
