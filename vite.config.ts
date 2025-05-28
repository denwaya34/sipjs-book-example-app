import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import tsconfigPaths from 'vite-tsconfig-paths';
import * as path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  server: {
    open: true,
  },
  plugins: [
    tsconfigPaths({
      projects: [
        './tsconfig.json',
      ],
    }),
    react(),
    tailwindcss(),
  ],
})
