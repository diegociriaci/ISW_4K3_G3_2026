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
  // Guía de estilo Airbnb (base + TypeScript)
  plugins.stylistic,
  plugins.importX,
  ...configs.base.recommended,
  plugins.typescriptEslint,
  ...configs.base.typescript,
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
    files: ["tests/**/*.ts", "*.config.ts", "*.config.mjs"],
    rules: {
      "import-x/no-extraneous-dependencies": [
        "error",
        { devDependencies: true },
      ],
    },
  },
  // Los errores de negocio se agrupan en un único archivo
  {
    files: ["src/errors/**/*.ts"],
    rules: {
      "max-classes-per-file": "off",
    },
  },
];
