import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
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
                  regex: "modules/breakout",
                  importNames: ["advance"],
                },
              ],
            },
          ],
        },
      },
    ],
  },
  test: {
    globals: true,
  },
});
