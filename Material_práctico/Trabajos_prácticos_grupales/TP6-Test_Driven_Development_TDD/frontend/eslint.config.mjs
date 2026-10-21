import path from "node:path";

import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import { configs, plugins } from "eslint-config-airbnb-extended";
import { rules as prettierConfigRules } from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

const gitignorePath = path.resolve(import.meta.dirname, "..", ".gitignore");

export default [
  includeIgnoreFile(gitignorePath),
  // Reglas recomendadas de ESLint
  {
    name: "js/config",
    ...js.configs.recommended,
  },
  // Guía de estilo Airbnb (base + React + TypeScript)
  plugins.stylistic,
  plugins.importX,
  ...configs.base.recommended,
  plugins.react,
  plugins.reactHooks,
  plugins.reactA11y,
  ...configs.react.recommended,
  plugins.typescriptEslint,
  ...configs.base.typescript,
  ...configs.react.typescript,
  // JSX runtime automático (React 17+): no hace falta importar React
  {
    name: "react/jsx-runtime",
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
    },
  },
  // Prettier se encarga del formato
  {
    name: "prettier/config",
    plugins: { prettier: prettierPlugin },
    rules: {
      ...prettierConfigRules,
      "prettier/prettier": "error",
    },
  },
  // Los tests y la configuración pueden importar devDependencies
  {
    files: ["tests/**/*.{ts,tsx}", "*.config.ts", "*.config.mjs"],
    rules: {
      "import-x/no-extraneous-dependencies": [
        "error",
        { devDependencies: true },
      ],
    },
  },
];
