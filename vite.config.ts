import { defineConfig } from "vite-plus";
import type { OxlintOverride } from "vite-plus/lint";

interface ImportPattern {
  readonly regex?: string;
  readonly group?: string[];
  readonly importNames?: string[];
  readonly allowTypeImports?: boolean;
}

interface Role {
  readonly name: string;
  readonly files: string;
  readonly patterns: readonly ImportPattern[];
}

interface Area {
  readonly dir: string;
  readonly roles?: readonly string[];
  readonly patterns: readonly ImportPattern[];
}

function role(...names: readonly string[]): ImportPattern {
  return { regex: String.raw`\.(${names.join("|")})(\.([cm]?[jt]sx?|vue))?$` };
}

const roles: readonly Role[] = [
  { name: "every", files: "*.{ts,tsx}", patterns: [role("dto")] },
  { name: "test", files: "*.test.{ts,tsx}", patterns: [] },
  { name: "model-test", files: "*.model.test.{ts,tsx}", patterns: [] },
  { name: "dto", files: "*.dto.ts", patterns: [] },
  { name: "api", files: "*.api.ts", patterns: [role("vm", "view")] },
  { name: "config", files: "*.config.ts", patterns: [role("dto")] },
  { name: "model", files: "*.model.ts", patterns: [role("vm", "view", "dto")] },
  {
    name: "vm",
    files: "*.vm.ts",
    patterns: [role("view", "dto"), { ...role("api"), allowTypeImports: true }],
  },
  { name: "view", files: "*.view.{ts,tsx}", patterns: [role("api", "dto")] },
];

const bareImport: ImportPattern = { regex: "^(@|[A-Za-z])" };
const webHost: readonly ImportPattern[] = [
  { group: ["@opentui/*"] },
  { regex: "[/.]terminal([/.]|$)" },
];
const terminalHost: readonly ImportPattern[] = [
  { group: ["@reatom/jsx"] },
  { regex: "[/.]web([/.]|$)" },
];
const tickImport: ImportPattern = { importNames: ["advance"], regex: "modules/breakout" };

const areas: readonly Area[] = [
  { dir: "src/modules/breakout", roles: ["config", "model", "model-test"], patterns: [bareImport] },
  { dir: "src/app/web", patterns: webHost },
  { dir: "src/app/terminal", patterns: terminalHost },
  { dir: "src/common/frame-rate", patterns: webHost },
  { dir: "src/pages", patterns: [tickImport] },
  { dir: "src/pages/web", patterns: [...webHost, tickImport] },
  { dir: "src/pages/terminal", patterns: [...terminalHost, tickImport] },
  { dir: "src/pages/web", roles: ["test"], patterns: webHost },
  { dir: "src/pages/terminal", roles: ["test"], patterns: terminalHost },
];

function restrict(patterns: readonly ImportPattern[]): OxlintOverride["rules"] {
  return {
    "no-restricted-imports": patterns.length === 0 ? "off" : ["error", { patterns: [...patterns] }],
  };
}

const roleOverrides: OxlintOverride[] = roles.map(({ files, patterns }) => ({
  files: [`src/**/${files}`],
  rules: restrict(patterns),
}));

// The last matching override replaces a rule's options instead of merging them,
// So every area override carries its role's patterns along with its own.
const areaOverrides: OxlintOverride[] = areas.flatMap((area) =>
  roles
    .filter(({ name }) => area.roles?.includes(name) ?? true)
    .map(({ files, patterns }) => ({
      files: [`${area.dir}/**/${files}`],
      rules: restrict([...patterns, ...area.patterns]),
    })),
);

export default defineConfig({
  base: "./",
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
    overrides: [...roleOverrides, ...areaOverrides],
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
  resolve: {
    tsconfigPaths: true,
  },
  staged: {
    "*.{ts,tsx}": "vp check --fix",
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}"],
      reporter: ["text", "json-summary"],
      reportOnFailure: true,
    },
    globals: true,
  },
});
