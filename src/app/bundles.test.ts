import path from "node:path";

import { type Rolldown, build } from "vite-plus";

type Chunk = Rolldown.OutputChunk;

const projectRoot = path.resolve(import.meta.dirname, "../..");

async function buildChunks(): Promise<readonly Chunk[]> {
  const output = await build({
    root: projectRoot,
    logLevel: "silent",
    build: { write: false },
  });

  if (!("output" in output)) {
    throw new Error("Expected a single build output");
  }

  return output.output.filter((file): file is Chunk => file.type === "chunk");
}

function slashed(id: string): string {
  return id.replaceAll("\\", "/");
}

function modulesOf(chunks: readonly Chunk[], page: "jsx" | "dom"): readonly string[] {
  const byFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
  const entry = chunks.find(({ facadeModuleId }) =>
    slashed(facadeModuleId ?? "").endsWith(`/${page}/index.html`),
  );

  if (!entry) {
    throw new Error(`No entry chunk for ${page}/index.html`);
  }

  const reached = new Set<Chunk>();
  const pending = [entry];

  for (let chunk = pending.pop(); chunk; chunk = pending.pop()) {
    if (!reached.has(chunk)) {
      reached.add(chunk);
      for (const fileName of [...chunk.imports, ...chunk.dynamicImports]) {
        const imported = byFile.get(fileName);

        if (imported) {
          pending.push(imported);
        }
      }
    }
  }

  return [...reached].flatMap(({ moduleIds }) => moduleIds.map((id) => slashed(id)));
}

function carries(modules: readonly string[], packageName: string): boolean {
  return modules.some((id) => id.includes(`/node_modules/${packageName}/`));
}

let chunks: readonly Chunk[] = [];

beforeAll(async () => {
  chunks = await buildChunks();
}, 60_000);

describe("the bundles", () => {
  test("the jsx build carries @reatom/jsx", () => {
    expect(carries(modulesOf(chunks, "jsx"), "@reatom/jsx")).toBe(true);
  });

  test("the DOM build carries Reatom without @reatom/jsx", () => {
    const modules = modulesOf(chunks, "dom");

    expect(carries(modules, "@reatom/core")).toBe(true);
    expect(carries(modules, "@reatom/jsx")).toBe(false);
  });
});
