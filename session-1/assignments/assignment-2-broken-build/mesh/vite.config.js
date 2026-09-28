import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // transformers.js dynamically loads its onnxruntime-web wasm at runtime
  // from /wasm/ (we ship it via public/). Excluding it from dep pre-bundling
  // stops Vite from statically importing the asyncify variant into the bundle.
  optimizeDeps: {
    exclude: ['@huggingface/transformers']
  },
  build: {
    chunkSizeWarningLimit: 1024
  },
  server: { port: 5173 }
});
