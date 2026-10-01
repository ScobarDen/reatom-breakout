// @vitest-environment happy-dom
import { context, noop, sleep, urlAtom } from "@reatom/core";
import { act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";

import { advance, bricks, matchControls } from "@/modules/breakout";
import { screenNavigation } from "@/modules/screens";
import { ScreensLayout } from "@/pages/react";

const renders = vi.hoisted(() => new Map<string, number>());

vi.mock(import("@reatom/react"), async (importOriginal) => {
  const original = await importOriginal();
  const reatomComponent: typeof original.reatomComponent = (render, options) => {
    const name = typeof options === "string" ? options : (options?.name ?? "");

    return original.reatomComponent((props) => {
      renders.set(name, (renders.get(name) ?? 0) + 1);

      return render(props);
    }, options);
  };

  return { ...original, reatomComponent };
});

vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

const roots: Root[] = [];

function renderLayout(): void {
  const root = createRoot(document.createElement("div"));

  roots.push(root);
  act(() => {
    root.render(createElement(ScreensLayout, { navigation: screenNavigation() }));
  });
}

function playUntilBrickBreaks(): void {
  const controls = matchControls();

  controls.press("space", false);
  controls.press("right", false);
  for (let frame = 0; frame < 10_000 && bricks.every(({ standing }) => standing()); frame++) {
    advance(16);
  }
}

beforeEach(() => {
  context.reset();
  urlAtom.sync.set(() => noop);
  urlAtom.syncFromSource(new URL("https://example.test/reatom-breakout/"));
  renders.clear();
});

afterEach(() => {
  act(() => {
    for (const root of roots.splice(0)) {
      root.unmount();
    }
  });
});

describe("the React view", () => {
  test("renders each brick once when the match opens", () => {
    renderLayout();

    expect(renders.get("BrickRect")).toBe(bricks.length);
  });

  test("renders again only the bricks that broke", async () => {
    renderLayout();
    playUntilBrickBreaks();
    await act(() => sleep(0));
    const broken = bricks.filter(({ standing }) => !standing()).length;

    expect(broken).toBeGreaterThan(0);
    expect(renders.get("BrickRect")).toBe(bricks.length + broken);
  });
});
