import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    sortImports: true,
  },
  lint: {
    categories: {
      correctness: "error",
      pedantic: "error",
      perf: "error",
      style: "error",
      suspicious: "error",
    },
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "@stylistic", specifier: "@stylistic/eslint-plugin" },
    ],
    options: { denyWarnings: true, typeAware: true, typeCheck: true },
    overrides: [
      {
        files: ["src/modules/breakout/domain/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [{ regex: "^(@|[A-Za-z])" }],
            },
          ],
        },
      },
      {
        files: ["src/app/web/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [{ group: ["@opentui/*"] }, { regex: "terminal" }],
            },
          ],
        },
      },
      {
        files: ["src/pages/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  importNames: ["advance"],
                  regex: "modules/breakout",
                },
              ],
            },
          ],
        },
      },
    ],
    rules: {
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: ["const", "let"], next: "*" },
        { blankLine: "any", prev: ["const", "let"], next: ["const", "let"] },
        { blankLine: "always", prev: "*", next: "function" },
        { blankLine: "always", prev: "function", next: "*" },
      ],
      "func-style": "off",
      "id-length": ["error", { exceptions: ["x", "y"] }],
      "max-lines": "off",
      "max-lines-per-function": "off",
      "max-params": "off",
      "max-statements": "off",
      "no-magic-numbers": "off",
      "no-ternary": "off",
      "one-var": "off",
      "sort-keys": "off",
      "sort-vars": "off",
      "typescript/prefer-readonly-parameter-types": "off",
      "unicorn/max-nested-calls": "off",
      "sort-imports": ["error", { ignoreDeclarationSort: true }],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
  },
  oxc: {
    jsx: { runtime: "classic", pragma: "h", pragmaFrag: "hf", throwIfNamespace: false },
    jsxInject: 'import { h, hf } from "@reatom/jsx"',
  },
  staged: {
    "*.{ts,tsx}": "vp check --fix",
  },
  test: {
    globals: true,
  },
});
