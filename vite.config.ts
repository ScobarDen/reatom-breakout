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
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
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
  staged: {
    "*.ts": "vp check --fix",
  },
  test: {
    globals: true,
  },
});
