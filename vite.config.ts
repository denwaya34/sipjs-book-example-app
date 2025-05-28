import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import tsconfigPaths from 'vite-tsconfig-paths';
import * as path from "node:path";
import checker from "vite-plugin-checker";

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
    checker({
      typescript: true,
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
      },
    }),
    react(),
    tailwindcss(),
  ],
})
