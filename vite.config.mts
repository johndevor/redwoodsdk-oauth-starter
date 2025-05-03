import path from "path"
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite"
import { redwood } from "@redwoodjs/sdk/vite";

export default defineConfig({
  environments: {
    ssr: {}
  },
  plugins: [redwood(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});