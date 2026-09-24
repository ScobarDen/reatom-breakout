import { appendFileSync, readFileSync } from "node:fs";
import { relative } from "node:path";

interface Metric {
  readonly pct: number;
}

interface FileCoverage {
  readonly statements: Metric;
  readonly branches: Metric;
  readonly functions: Metric;
  readonly lines: Metric;
}

const metrics = ["statements", "branches", "functions", "lines"] as const;
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

if (summaryPath === undefined) {
  throw new Error("GITHUB_STEP_SUMMARY is not set");
}

type CoverageReport = Record<string, FileCoverage> & { readonly total: FileCoverage };

function isCoverageReport(value: unknown): value is CoverageReport {
  return typeof value === "object" && value !== null && "total" in value;
}

const report: unknown = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));

if (!isCoverageReport(report)) {
  throw new Error("coverage/coverage-summary.json has no total");
}

const { total, ...files } = report;

function row(name: string, coverage: FileCoverage): string {
  return `| ${name} | ${metrics.map((metric) => `${coverage[metric].pct}%`).join(" | ")} |`;
}

function sourceName(path: string): string {
  return `\`${relative(process.cwd(), path).replaceAll("\\", "/")}\``;
}

const table = [
  "## Coverage",
  "",
  "| File | Statements | Branches | Functions | Lines |",
  "| --- | ---: | ---: | ---: | ---: |",
  row("**All files**", total),
  ...Object.entries(files).map(([path, coverage]) => row(sourceName(path), coverage)),
];

appendFileSync(summaryPath, `${table.join("\n")}\n`);
