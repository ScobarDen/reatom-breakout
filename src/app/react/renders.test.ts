// @vitest-environment happy-dom
import { context, sleep } from "@reatom/core";
import { act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";

import { bricks } from "@/modules/breakout";
import { screenNavigation } from "@/modules/screens";
import { ScreensLayout } from "@/pages/react";

import { playUntilBrickBreaks, visit } from "../play.testing.ts";

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

beforeEach(() => {
  context.reset();
  visit("https://example.test/reatom-breakout/");
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

  test("renders again only the bricks that broke, not the board", async () => {
    renderLayout();
    playUntilBrickBreaks();
    await act(() => sleep(0));
    const broken = bricks.filter(({ standing }) => !standing()).length;

    expect(broken).toBeGreaterThan(0);
    expect(renders.get("BrickRect")).toBe(bricks.length + broken);
    expect(renders.get("ScreensLayout")).toBe(1);
  });
});
