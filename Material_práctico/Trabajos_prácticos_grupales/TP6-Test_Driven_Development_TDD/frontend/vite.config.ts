import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  // "npm run dev:https" sirve la app con un certificado local: Mercado Pago
  // sólo vuelve automáticamente a la app después de pagar si la URL es https
  plugins: [react(), ...(mode === "https" ? [basicSsl()] : [])],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    css: false,
  },
}));
