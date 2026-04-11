import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "vite.config.ts.timestamp-*.mjs",
      "local_types.ts",
      "script.js",
      "temp.ts",
      "temp_pos.tsx",
      "whiteboard_dump.tsx",
      "check_commission.ts",
      "check_commission.js",
      "userlive_dump.txt",
      "build_responsive_editor.txt",
      "chunk.txt",
      "result.txt",
      "error.txt",
      "runner.txt",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  }
);
